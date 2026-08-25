import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { bookPickupForOrder } from "@/lib/book-pickup";
import { isMissingPickupWaybill } from "@/lib/missing-pickup";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;

  const { id: orderId } = await params;
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
      trackingNo: order.tracking_no || shipment?.pickup_tracking_no,
    });
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
