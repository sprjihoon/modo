import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedUser } from "@/lib/order-pricing";

/**
 * POST /api/admin/test/skip-payment
 *
 * 결제 게이트웨이를 우회해서 payment_intent → 주문 생성 → 우체국 수거예약을
 * 한 번에 진행한다. 운영 환경에서는 ops_center_settings.show_test_buttons
 * 가 true 인 경우에만 동작한다. (관리자 페이지에서 ON/OFF)
 *
 * Body: { intentId: string, testMode: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { intentId, testMode } = await request.json();
    if (!intentId || typeof intentId !== "string") {
      return NextResponse.json(
        { error: "intentId 가 필요합니다." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !srk) {
      return NextResponse.json(
        { error: "서버 설정 오류 (SERVICE_ROLE_KEY 누락)" },
        { status: 500 }
      );
    }
    const admin = createSupabaseClient(url, srk, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 테스트 버튼이 켜져 있는지 검사 — 운영 안전 가드
    const { data: settings } = await admin
      .from("ops_center_settings")
      .select("show_test_buttons")
      .limit(1)
      .maybeSingle();
    if (!settings?.show_test_buttons) {
      return NextResponse.json(
        { error: "테스트 버튼이 비활성화되어 있습니다. (관리자 설정 확인)" },
        { status: 403 }
      );
    }

    // intent 조회 (payload 안에 주문 생성에 필요한 모든 필드가 있다)
    const { data: intent, error: intentErr } = await admin
      .from("payment_intents")
      .select("id, total_price, payload, consumed_at, consumed_order_id, user_id")
      .eq("id", intentId)
      .maybeSingle();

    if (intentErr || !intent) {
      return NextResponse.json(
        { error: "결제 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (intent.consumed_at && intent.consumed_order_id) {
      return NextResponse.json(
        { orderId: intent.consumed_order_id, alreadyConsumed: true },
        { status: 200 }
      );
    }
    // 본인 intent 만 진행 가능 (관리자더라도 cross-user 테스트는 차단)
    if (intent.user_id && intent.user_id !== user.internalUserId) {
      return NextResponse.json(
        { error: "다른 사용자의 결제는 테스트할 수 없습니다." },
        { status: 403 }
      );
    }

    const p = (intent.payload ?? {}) as Record<string, unknown>;
    const orderNumber = `ORD${Date.now()}`;

    const insertData: Record<string, unknown> = {
      user_id: user.internalUserId,
      status: "PAID",
      payment_status: "PAID",
      paid_at: new Date().toISOString(),
      order_number: orderNumber,
      item_name: p.itemName,
      clothing_type: p.clothingType,
      repair_type: p.repairType,
      pickup_address: p.pickupAddress,
      pickup_address_detail: p.pickupAddressDetail,
      pickup_zipcode: p.pickupZipcode,
      pickup_phone: p.pickupPhone,
      pickup_date: p.pickupDate,
      delivery_address: p.deliveryAddress,
      delivery_address_detail: p.deliveryAddressDetail,
      delivery_zipcode: p.deliveryZipcode,
      delivery_phone: p.deliveryPhone,
      customer_name: p.customerName,
      customer_email: p.customerEmail,
      customer_phone: p.customerPhone,
      notes: p.notes,
      base_price: p.basePrice,
      total_price: intent.total_price,
      shipping_fee: p.shippingFee,
      shipping_discount_amount: p.shippingDiscountAmount,
      shipping_promotion_id: p.shippingPromotionId,
      remote_area_fee: p.remoteAreaFee,
      promotion_code_id: p.promotionCodeId,
      promotion_discount_amount: p.promotionDiscountAmount,
      original_total_price: p.originalTotalPrice,
      repair_parts: p.repairParts,
      images_with_pins: p.imagesWithPins,
      images: p.imageUrls ? { urls: p.imageUrls } : null,
    };

    // (PGRST204) 없는 컬럼은 자동 제거하며 재시도 — orders-free 와 동일
    let inserted: { id: string } | null = null;
    let lastErr: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const r = await admin.from("orders").insert(insertData).select("id").single();
      if (!r.error) {
        inserted = r.data as { id: string };
        break;
      }
      lastErr = r.error as { code?: string; message?: string };
      const m = lastErr?.message?.match(/Could not find the '(.+?)' column/);
      if (lastErr.code === "PGRST204" && m?.[1]) {
        delete insertData[m[1]];
        continue;
      }
      break;
    }

    if (!inserted) {
      console.error("[test/skip-payment] 주문 생성 실패:", lastErr);
      return NextResponse.json(
        { error: `주문 생성 실패: ${lastErr?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    // intent 소비 처리 (멱등 보호)
    await admin
      .from("payment_intents")
      .update({
        consumed_at: new Date().toISOString(),
        consumed_order_id: inserted.id,
      })
      .eq("id", intentId);

    // 우체국 수거 예약 호출 — 주소/고객 정보 없으면 스킵
    let trackingNo: string | null = null;
    let bookErrorMessage: string | null = null;

    const pickupAddr = ((p.pickupAddress as string) ?? "").trim();
    const custName = ((p.customerName as string) ?? "").trim();
    const shouldSkipShipment = !pickupAddr || !custName;

    if (shouldSkipShipment) {
      console.log("[test/skip-payment] 수거 예약 스킵: 주소 또는 고객 정보 없음");
    } else {
      try {
        const bookRes = await fetch(`${url}/functions/v1/shipments-book`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${srk}`,
            apikey: srk,
          },
          body: JSON.stringify({
            order_id: inserted.id,
            customer_name: custName,
            pickup_address: pickupAddr,
            pickup_phone: p.pickupPhone ?? "010-1234-5678",
            pickup_zipcode: (p.pickupZipcode as string) ?? "",
            delivery_address: p.deliveryAddress ?? pickupAddr,
            delivery_phone: p.deliveryPhone ?? p.pickupPhone ?? "010-1234-5678",
            delivery_zipcode: (p.deliveryZipcode as string) ?? "",
            delivery_message: (p.notes as string) ?? "",
            test_mode: !!testMode,
          }),
        });
        const bookData = await bookRes.json();
        if (bookRes.ok) {
          trackingNo =
            bookData?.data?.tracking_no ?? bookData?.data?.pickup_tracking_no ?? null;
        } else {
          bookErrorMessage = bookData?.error ?? "수거 예약 실패";
          console.error("[test/skip-payment] 수거 예약 실패:", bookData);
        }
      } catch (e) {
        bookErrorMessage = e instanceof Error ? e.message : String(e);
        console.error("[test/skip-payment] 수거 예약 호출 오류:", e);
      }
    }

    return NextResponse.json({
      orderId: inserted.id,
      trackingNo,
      testMode: !!testMode,
      bookErrorMessage,
      shipmentSkipped: shouldSkipShipment,
    });
  } catch (e) {
    console.error("[test/skip-payment] error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
