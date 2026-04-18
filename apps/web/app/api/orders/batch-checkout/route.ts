import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BASE_SHIPPING_FEE } from "@/lib/shipping-promotion";

/**
 * POST /api/orders/batch-checkout
 * 여러 PENDING_PAYMENT 주문을 1건으로 병합하여 결제 준비
 * - 모든 수선 항목 합산
 * - 왕복배송비 1회만 적용
 * - 첫 번째 주문을 대표 주문으로 유지, 나머지는 CANCELLED
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderIds } = await request.json() as { orderIds: string[] };

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds required" }, { status: 400 });
    }

    // 단일 주문이면 그냥 반환
    if (orderIds.length === 1) {
      return NextResponse.json({ orderId: orderIds[0], merged: false });
    }

    // 사용자 내부 ID 조회
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 선택된 주문 모두 조회 — 필수 컬럼만 (없는 컬럼이 포함되면 전체 쿼리 실패)
    const selectCols = "id, user_id, item_name, clothing_type, total_price, shipping_fee, repair_parts";
    let orders: Record<string, unknown>[] | null = null;
    let fetchErr: unknown = null;

    const { data: d1, error: e1 } = await supabase
      .from("orders")
      .select(selectCols)
      .in("id", orderIds)
      .eq("status", "PENDING_PAYMENT");

    if (e1) {
      // 일부 컬럼이 없을 수 있으므로 최소한으로 재시도
      console.warn("Batch fetch attempt 1 failed:", e1.message);
      const { data: d2, error: e2 } = await supabase
        .from("orders")
        .select("id, user_id, item_name, clothing_type, total_price")
        .in("id", orderIds)
        .eq("status", "PENDING_PAYMENT");
      orders = d2 as Record<string, unknown>[] | null;
      fetchErr = e2;
    } else {
      orders = d1 as Record<string, unknown>[] | null;
    }

    if (fetchErr || !orders || orders.length === 0) {
      console.error("Batch fetch final error:", fetchErr);
      return NextResponse.json(
        { error: `Orders not found (${orders?.length ?? 0} matched, requested ${orderIds.length})` },
        { status: 404 }
      );
    }

    // 본인 주문인지 확인
    const ownerIds = [userRow.id as string, user.id];
    const unauthorized = orders.some((o) => !ownerIds.includes(o.user_id as string));
    if (unauthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // repair_parts는 TEXT[] 또는 JSONB[] 형태일 수 있음
    // TEXT[]인 경우 각 element가 JSON 문자열이므로 파싱 필요
    type RepairPart = { name: string; price: number; quantity: number; detail?: string };

    const parseRepairPart = (raw: unknown): RepairPart | null => {
      if (!raw) return null;
      if (typeof raw === "string") {
        try { return JSON.parse(raw) as RepairPart; } catch { return null; }
      }
      if (typeof raw === "object") return raw as RepairPart;
      return null;
    };

    const allRepairParts: RepairPart[] = orders.flatMap((o) => {
      if (!Array.isArray(o.repair_parts)) return [];
      return (o.repair_parts as unknown[]).map(parseRepairPart).filter((p): p is RepairPart => p !== null);
    });

    // 수선비 합산 (배송비 제외)
    // repair_parts가 없거나 0원이면 각 주문의 total_price - shipping_fee로 fallback
    let totalRepairAmount = allRepairParts.reduce(
      (sum, p) => sum + (p.price ?? 0) * (p.quantity ?? 1),
      0
    );

    if (totalRepairAmount === 0) {
      // repair_parts 파싱 실패 시: total_price - shipping_fee 합산으로 fallback
      totalRepairAmount = orders.reduce((sum, o) => {
        const shipping = (o.shipping_fee as number | null) ?? BASE_SHIPPING_FEE;
        return sum + Math.max(0, ((o.total_price as number) ?? 0) - shipping);
      }, 0);
    }

    // 배송비 프로모션 확인
    let shippingFee = BASE_SHIPPING_FEE;
    let shippingDiscountAmount = 0;
    let shippingPromotionId: string | null = null;

    try {
      const now = new Date().toISOString();
      const { data: promotions } = await supabase
        .from("shipping_promotions")
        .select("*")
        .eq("is_active", true)
        .lte("valid_from", now)
        .or(`valid_until.is.null,valid_until.gte.${now}`);

      if (promotions && promotions.length > 0) {
        const hasFirstOrderPromo = promotions.some((p) => p.type === "FIRST_ORDER");
        let isFirstOrder = false;

        if (hasFirstOrderPromo) {
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userRow.id)
            .not("status", "in", '("CANCELLED","PENDING_PAYMENT")');
          isFirstOrder = (count ?? 0) === 0;
        }

        let bestDiscount = 0;
        let bestPromoId: string | null = null;

        for (const promo of promotions) {
          let eligible = false;
          switch (promo.type) {
            case "FIRST_ORDER": eligible = isFirstOrder; break;
            case "FREE_ABOVE_AMOUNT":
            case "PERCENTAGE_OFF":
            case "FIXED_DISCOUNT":
              eligible = totalRepairAmount >= (promo.min_order_amount ?? 0);
              break;
          }
          if (!eligible) continue;

          let discountAmt = promo.discount_type === "PERCENTAGE"
            ? Math.round(BASE_SHIPPING_FEE * promo.discount_value / 100)
            : promo.discount_value;

          if (promo.max_discount_amount != null) discountAmt = Math.min(discountAmt, promo.max_discount_amount);
          discountAmt = Math.min(discountAmt, BASE_SHIPPING_FEE);

          if (discountAmt > bestDiscount) {
            bestDiscount = discountAmt;
            bestPromoId = promo.id;
          }
        }

        shippingDiscountAmount = bestDiscount;
        shippingFee = BASE_SHIPPING_FEE - bestDiscount;
        shippingPromotionId = bestPromoId;
      }
    } catch { /* 기본 배송비 유지 */ }

    const newTotal = totalRepairAmount + shippingFee;
    const primaryOrder = orders[0];
    const otherOrderIds = orders.slice(1).map((o) => o.id);

    // 합산된 item_name 생성
    const combinedItemName = allRepairParts.length > 0
      ? allRepairParts.map((p) => p.name).join(", ")
      : orders.map((o) => o.item_name).filter(Boolean).join(", ");
    const clothingTypes = orders.map((o) => o.clothing_type).filter(Boolean) as string[];
    const combinedClothingType = clothingTypes.filter((v, i, a) => a.indexOf(v) === i).join(", ");

    // 첫 번째 주문을 업데이트 (PGRST204 오류 시 없는 컬럼 제거 후 재시도)
    // repair_parts: 파싱된 객체 배열로 저장 (Supabase가 적절히 직렬화)
    const repairPartsForUpdate = allRepairParts.length > 0 ? allRepairParts : undefined;

    let updateData: Record<string, unknown> = {
      item_name: combinedItemName || primaryOrder.item_name,
      clothing_type: combinedClothingType || primaryOrder.clothing_type,
      total_price: newTotal,
      shipping_fee: BASE_SHIPPING_FEE,
      shipping_discount_amount: shippingDiscountAmount,
      ...(shippingPromotionId ? { shipping_promotion_id: shippingPromotionId } : {}),
      ...(repairPartsForUpdate ? { repair_parts: repairPartsForUpdate } : {}),
    };

    let updateErr: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", primaryOrder.id);
      updateErr = result.error as { code?: string; message?: string } | null;
      if (!updateErr) break;
      if (updateErr.code === "PGRST204" && updateErr.message) {
        const match = updateErr.message.match(/Could not find the '(.+?)' column/);
        if (match?.[1]) {
          console.warn(`Batch update: 컬럼 '${match[1]}' 없음, 제거 후 재시도`);
          delete updateData[match[1]];
          continue;
        }
      }
      break;
    }

    if (updateErr) {
      console.error("Batch update error:", updateErr);
      return NextResponse.json({ error: "Failed to merge orders" }, { status: 500 });
    }

    // 나머지 주문 취소
    if (otherOrderIds.length > 0) {
      await supabase
        .from("orders")
        .update({ status: "CANCELLED" })
        .in("id", otherOrderIds);
    }

    return NextResponse.json({
      orderId: primaryOrder.id,
      merged: true,
      mergedCount: orders.length,
      totalPrice: newTotal,
      repairAmount: totalRepairAmount,
      shippingFee: BASE_SHIPPING_FEE,
      shippingDiscountAmount,
    });
  } catch (e) {
    console.error("Batch checkout error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
