import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * 포인트로 전액 결제(잔액 0원) 시 PortOne 없이 주문 생성
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userRow } = await svc
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!userRow?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: intent, error: intentErr } = await svc
      .from("payment_intents")
      .select(
        "id, user_id, total_price, points_used, charge_before_points, payload, expires_at, consumed_at, consumed_order_id"
      )
      .eq("id", intentId)
      .maybeSingle();

    if (intentErr || !intent) {
      return NextResponse.json({ error: "결제 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    if (intent.user_id !== userRow.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (intent.consumed_at && intent.consumed_order_id) {
      return NextResponse.json({
        orderId: intent.consumed_order_id,
        idempotent: true,
      });
    }
    if (new Date(intent.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "결제 시간이 만료되었습니다." }, { status: 400 });
    }
    if (Number(intent.total_price) !== 0) {
      return NextResponse.json(
        { error: "카드 결제가 필요한 금액이 남아 있습니다.", totalPrice: intent.total_price },
        { status: 400 }
      );
    }
    if (!intent.points_used || intent.points_used <= 0) {
      return NextResponse.json({ error: "포인트 사용 내역이 없습니다." }, { status: 400 });
    }

    const p = (intent.payload || {}) as Record<string, unknown>;
    const orderNumber = `ORD${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const insertData: Record<string, unknown> = {
      user_id: userRow.id,
      status: "PAID",
      payment_status: "PAID",
      paid_at: new Date().toISOString(),
      order_number: orderNumber,
      item_name: p.itemName,
      clothing_type: p.clothingType || "기타",
      repair_type: p.repairType || "수선",
      pickup_address: p.pickupAddress,
      pickup_address_detail: p.pickupAddressDetail || null,
      pickup_zipcode: p.pickupZipcode || null,
      pickup_phone: p.pickupPhone || "010-0000-0000",
      pickup_date: p.pickupDate || null,
      delivery_address: p.deliveryAddress || p.pickupAddress,
      delivery_address_detail: p.deliveryAddressDetail || p.pickupAddressDetail || null,
      delivery_zipcode: p.deliveryZipcode || p.pickupZipcode || null,
      delivery_phone: p.deliveryPhone || p.pickupPhone || "010-0000-0000",
      customer_name: p.customerName || "고객",
      customer_phone: p.customerPhone || p.pickupPhone || "010-0000-0000",
      customer_email: p.customerEmail || null,
      notes: p.notes || null,
      base_price: p.basePrice ?? null,
      total_price: 0,
      shipping_fee: p.shippingFee ?? null,
      shipping_discount_amount: p.shippingDiscountAmount ?? 0,
      shipping_promotion_id: p.shippingPromotionId || null,
      remote_area_fee: p.remoteAreaFee ?? 0,
      promotion_code_id: p.promotionCodeId || null,
      promotion_discount_amount: p.promotionDiscountAmount ?? null,
      original_total_price: intent.charge_before_points ?? p.originalTotalPrice ?? null,
      points_used: intent.points_used,
      repair_parts: Array.isArray(p.repairParts) ? p.repairParts : null,
      images_with_pins: Array.isArray(p.imagesWithPins) ? p.imagesWithPins : null,
      images: Array.isArray(p.imageUrls) ? { urls: p.imageUrls } : null,
    };

    let inserted: { id: string } | null = null;
    let lastErr: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const r = await svc.from("orders").insert(insertData).select("id").single();
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
      console.error("[complete-with-points] insert fail", lastErr);
      return NextResponse.json({ error: "주문 생성 실패" }, { status: 500 });
    }

    await svc
      .from("payment_intents")
      .update({
        consumed_at: new Date().toISOString(),
        consumed_order_id: inserted.id,
      })
      .eq("id", intentId);

    // USED 트랜잭션에 order_id 연결 (설명 매칭)
    try {
      await svc
        .from("point_transactions")
        .update({ order_id: inserted.id })
        .eq("user_id", userRow.id)
        .eq("type", "USED")
        .is("order_id", null)
        .like("description", `%intent:${intentId}%`);
    } catch {
      /* ignore */
    }

    // 우체국 수거 예약 (기존 free 경로와 동일 패턴)
    try {
      const { error: bookErr } = await svc.functions.invoke("shipments-book", {
        body: { order_id: inserted.id },
      });
      if (bookErr) console.error("[complete-with-points] book", bookErr);
    } catch (e) {
      console.error("[complete-with-points] book invoke", e);
    }

    return NextResponse.json({ orderId: inserted.id });
  } catch (e) {
    console.error("[complete-with-points]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
