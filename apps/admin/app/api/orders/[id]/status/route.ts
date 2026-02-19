import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 주문 상태 변경 API
 * 
 * PATCH /api/orders/[id]/status
 * Body: { status: string, trackingNo?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "주문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { status, trackingNo } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "상태값이 필요합니다." },
        { status: 400 }
      );
    }

    // 유효한 상태값 확인
    const validStatuses = [
      "PENDING", "PAID", "BOOKED", "INBOUND", "PROCESSING", 
      "READY_TO_SHIP", "DELIVERED", "CANCELLED", "COMPLETED",
      "IN_REPAIR", "REPAIR_COMPLETED", "SHIPPED", "RECEIVED"
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 상태값입니다: ${status}` },
        { status: 400 }
      );
    }

    // 1. 주문 상태 변경
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (orderError) {
      console.error("주문 상태 변경 실패:", orderError);
      return NextResponse.json(
        { success: false, error: `주문 상태 변경 실패: ${orderError.message}` },
        { status: 500 }
      );
    }

    // 2. 송장 상태도 변경 (trackingNo가 있는 경우)
    if (trackingNo) {
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("pickup_tracking_no", trackingNo);

      if (shipmentError) {
        console.error("송장 상태 변경 실패:", shipmentError);
        // 송장 에러는 경고만 하고 계속 진행
      }
    }

    // 3. 상태 변경 로그 기록 (action_logs 테이블이 있는 경우)
    try {
      await supabase.from("action_logs").insert({
        action_type: "ORDER_STATUS_CHANGED",
        entity_type: "order",
        entity_id: orderId,
        details: {
          previousStatus: order?.status,
          newStatus: status,
          trackingNo,
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // 로그 실패는 무시
      console.log("상태 변경 로그 기록 실패:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "상태가 변경되었습니다.",
      order,
    });
  } catch (error: any) {
    console.error("주문 상태 변경 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


