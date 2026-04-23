import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getShippingSettings } from "@/lib/shipping-settings";

/**
 * POST /api/orders/batch-checkout
 * 여러 PENDING_PAYMENT 주문을 합포장 결제 준비
 * - 실제로 주문을 병합/삭제하지 않음 (결제 성공 후에만 병합)
 * - 대표 주문의 total_price만 합산 금액으로 임시 업데이트
 * - 원본 데이터를 반환하여 클라이언트가 복원 가능
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderIds } = await request.json() as { orderIds: string[] };

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds required" }, { status: 400 });
    }

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

    // 선택된 주문 조회
    const { data: orders, error: fetchErr } = await supabase
      .from("orders")
      .select("id, user_id, item_name, clothing_type, total_price, shipping_fee, repair_parts")
      .in("id", orderIds)
      .eq("status", "PENDING_PAYMENT");

    if (fetchErr || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: `Orders not found (requested ${orderIds.length})` },
        { status: 404 }
      );
    }

    // 본인 주문 확인
    const ownerIds = [userRow.id as string, user.id];
    if (orders.some((o) => !ownerIds.includes(o.user_id as string))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SQL 반환 순서가 보장되지 않으므로 orderIds 순서에 맞게 정렬
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const sortedOrders = orderIds.map((id) => orderMap.get(id)).filter(Boolean) as typeof orders;

    // 글로벌 배송비 설정 (관리자 페이지에서 변경 가능)
    const shippingSettings = await getShippingSettings();
    const baseShippingFee = shippingSettings.baseShippingFee;

    // 수선비 합산 (배송비 제외)
    const totalRepairAmount = sortedOrders.reduce((sum, o) => {
      const shipping = (o.shipping_fee as number | null) ?? baseShippingFee;
      return sum + Math.max(0, ((o.total_price as number) ?? 0) - shipping);
    }, 0);

    // 배송비 1회만
    const shippingFee = baseShippingFee;
    const newTotal = totalRepairAmount + shippingFee;

    // 대표 주문(orderIds 첫 번째)의 total_price만 합산으로 임시 업데이트
    const primaryOrder = sortedOrders[0];
    const originalPrimaryTotal = primaryOrder.total_price as number;

    await supabase
      .from("orders")
      .update({ total_price: newTotal })
      .eq("id", primaryOrder.id);

    // 나머지 주문은 건드리지 않음! (결제 성공 후에만 처리)

    return NextResponse.json({
      orderId: primaryOrder.id,
      merged: false,
      batchMode: true,
      otherOrderIds: sortedOrders.slice(1).map((o) => o.id),
      originalPrimaryTotal,
      totalPrice: newTotal,
      repairAmount: totalRepairAmount,
      shippingFee,
    });
  } catch (e) {
    console.error("Batch checkout error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
