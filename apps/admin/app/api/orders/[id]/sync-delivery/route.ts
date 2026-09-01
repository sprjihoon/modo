import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

const SYNCABLE_STATUSES = new Set(["READY_TO_SHIP", "OUT_FOR_DELIVERY", "IN_TRANSIT"]);

/**
 * 우체국 종적조회로 배송완료 여부를 확인하고, 완료면 DELIVERED 로 반영한다.
 * POST /api/orders/[id]/sync-delivery
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { id: orderId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!SYNCABLE_STATUSES.has(order.status)) {
      return NextResponse.json({
        success: true,
        updated: false,
        status: order.status,
        skipped: true,
      });
    }

    const { data: shipment } = await supabase
      .from("shipments")
      .select("delivery_tracking_no")
      .eq("order_id", orderId)
      .not("delivery_tracking_no", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const trackingNo = shipment?.delivery_tracking_no;
    if (!trackingNo) {
      return NextResponse.json({
        success: true,
        updated: false,
        status: order.status,
        skipped: true,
      });
    }

    const { error: fnError } = await supabase.functions.invoke("shipments-track", {
      body: { tracking_no: trackingNo },
    });

    if (fnError) {
      console.error("배송 동기화 실패:", fnError);
      return NextResponse.json(
        { success: false, error: fnError.message || "배송 추적에 실패했습니다." },
        { status: 502 }
      );
    }

    const { data: refreshed } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    const nextStatus = refreshed?.status ?? order.status;
    return NextResponse.json({
      success: true,
      updated: nextStatus !== order.status,
      status: nextStatus,
      previousStatus: order.status,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
