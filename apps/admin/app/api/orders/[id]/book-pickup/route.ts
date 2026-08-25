import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { bookPickupForOrder } from "@/lib/book-pickup";
import { isMissingPickupWaybill, isRealTrackingNo } from "@/lib/missing-pickup";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;

  const { id: orderId } = await params;
  const body = await request.json().catch(() => ({}));
  const pickupDate = typeof body?.pickupDate === "string" ? body.pickupDate.trim() : "";
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.canceled_at || order.status === "CANCELLED") {
    return NextResponse.json({ success: false, error: "취소된 주문은 수거예약할 수 없습니다." }, { status: 400 });
  }

  const { data: shipment } = await admin
    .from("shipments")
    .select("pickup_tracking_no, tracking_no")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isMissingPickupWaybill({ ...order, shipment })) {
    return NextResponse.json({
      success: true,
      alreadyBooked: true,
      trackingNo: isRealTrackingNo(order.tracking_no)
        ? order.tracking_no
        : shipment?.pickup_tracking_no,
    });
  }

  if (pickupDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return NextResponse.json({ success: false, error: "수거일 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const { error: dateErr } = await admin
      .from("orders")
      .update({ pickup_date: pickupDate })
      .eq("id", orderId);
    if (dateErr) {
      return NextResponse.json({ success: false, error: dateErr.message }, { status: 500 });
    }
    order.pickup_date = pickupDate;
  }

  const result = await bookPickupForOrder(order);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error || "수거예약에 실패했습니다.", code: result.code },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    trackingNo: result.trackingNo,
    attempts: result.attempts,
  });
}
