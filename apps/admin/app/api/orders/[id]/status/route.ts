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
  { params }: { params: Promise<{ id: string }> }
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
      "IN_REPAIR", "REPAIR_COMPLETED", "SHIPPED", "RECEIVED",
      "RETURN_SHIPPING", "RETURN_DONE", "PICKED_UP",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 상태값입니다: ${status}` },
        { status: 400 }
      );
    }

    // 상태 전이 허용 맵: 현재 상태 → 이동 가능한 다음 상태들
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      PENDING:          ["PAID", "CANCELLED"],
      PAID:             ["BOOKED", "CANCELLED"],
      BOOKED:           ["PICKED_UP", "INBOUND", "CANCELLED"],
      PICKED_UP:        ["INBOUND", "CANCELLED"],
      INBOUND:          ["PROCESSING", "CANCELLED"],
      PROCESSING:       ["IN_REPAIR", "READY_TO_SHIP", "CANCELLED"],
      IN_REPAIR:        ["REPAIR_COMPLETED", "READY_TO_SHIP", "CANCELLED"],
      REPAIR_COMPLETED: ["READY_TO_SHIP", "CANCELLED"],
      READY_TO_SHIP:    ["SHIPPED", "CANCELLED"],
      SHIPPED:          ["DELIVERED", "CANCELLED"],
      DELIVERED:        ["COMPLETED", "RETURN_SHIPPING"],
      RECEIVED:         ["COMPLETED", "RETURN_SHIPPING"],
      COMPLETED:        [],
      CANCELLED:        [],
      RETURN_SHIPPING:  ["RETURN_DONE"],
      RETURN_DONE:      [],
    };

    // 현재 주문 상태 조회 (역행 방지 검증용)
    const { data: current, error: currentError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { success: false, error: "주문 정보를 조회할 수 없습니다." },
        { status: 404 }
      );
    }

    const currentStatus = current.status as string;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (allowed !== undefined && !allowed.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `상태 전이가 허용되지 않습니다: ${currentStatus} → ${status}`,
          allowedTransitions: allowed,
        },
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
          previousStatus: currentStatus,
          newStatus: status,
          trackingNo,
        },
        created_at: new Date().toISOString(),
      } as any);
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


