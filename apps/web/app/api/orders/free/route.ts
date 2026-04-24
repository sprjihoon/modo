import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAuthorizedUser, quoteOrder } from "@/lib/order-pricing";

/**
 * POST /api/orders/free
 *
 * 0원 주문 전용 엔드포인트. (프로모션으로 수선비+배송비가 모두 0원이 된 경우)
 * 결제 단계 없이 바로 orders 를 PAID 상태로 INSERT 하고 수거 예약을 호출한다.
 *
 * 클라이언트는 quote 결과 totalPrice === 0 인 경우 이 엔드포인트로 분기한다.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.agreedToExtraCharge) {
      return NextResponse.json({ error: "추가 결제 동의가 필요합니다." }, { status: 400 });
    }

    const quote = await quoteOrder(user, body);

    if (quote.totalPrice !== 0) {
      return NextResponse.json(
        { error: "0원이 아닌 주문입니다. 결제를 진행해주세요.", totalPrice: quote.totalPrice },
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

    const p = quote.pickupPayload;
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
      total_price: 0,
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
      console.error("0원 주문 생성 실패:", lastErr);
      return NextResponse.json({ error: "주문 생성 실패" }, { status: 500 });
    }

    // 수거 예약 호출
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
          customer_name: p.customerName,
          pickup_address: p.pickupAddress,
          pickup_phone: p.pickupPhone,
          pickup_zipcode: p.pickupZipcode ?? "",
          delivery_address: p.deliveryAddress,
          delivery_phone: p.deliveryPhone,
          delivery_zipcode: p.deliveryZipcode ?? "",
          delivery_message: p.notes ?? "",
          test_mode: false,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) console.error("0원 주문 수거 예약 실패:", bookData);
    } catch (e) {
      console.error("0원 주문 수거 예약 호출 오류 (무시):", e);
    }

    return NextResponse.json({ orderId: inserted.id, totalPrice: 0 });
  } catch (e) {
    console.error("orders/free error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
