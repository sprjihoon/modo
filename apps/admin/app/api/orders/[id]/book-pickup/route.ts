import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { bookPickupForOrder } from "@/lib/book-pickup";
import { isMissingPickupWaybill, isRealTrackingNo } from "@/lib/missing-pickup";
import { canRebookPickup } from "@/lib/rebook-pickup";
import { notifyCustomer } from "@/lib/notify-customer";

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
  const forceRebook = body?.forceRebook === true;
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
    .select("pickup_tracking_no, tracking_no, status, pickup_completed_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (forceRebook) {
    if (!canRebookPickup({
      status: order.status,
      canceled_at: order.canceled_at,
      shipmentStatus: shipment?.status,
      pickupCompletedAt: shipment?.pickup_completed_at,
    })) {
      return NextResponse.json(
        { success: false, error: "현재 상태에서는 수거를 재접수할 수 없습니다." },
        { status: 400 }
      );
    }
  } else if (!isMissingPickupWaybill({ ...order, shipment })) {
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

  const result = await bookPickupForOrder(
    order,
    forceRebook ? { force_rebook: true, pickup_date: pickupDate || undefined } : undefined
  );
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error || "수거예약에 실패했습니다.", code: result.code },
      { status: 502 }
    );
  }

  if (forceRebook && result.trackingNo) {
    const dateLabel = pickupDate || "우체국 기본일";
    await notifyCustomer(admin, {
      userId: order.user_id,
      orderId,
      type: "pickup_rebooked",
      title: "수거가 다시 예약되었습니다",
      body: `미수거되어 새 수거일(${dateLabel})로 재접수했습니다. 송장번호 ${result.trackingNo}`,
    });
  }

  return NextResponse.json({
    success: true,
    trackingNo: result.trackingNo,
    attempts: result.attempts,
    rebooked: forceRebook,
  });
}
