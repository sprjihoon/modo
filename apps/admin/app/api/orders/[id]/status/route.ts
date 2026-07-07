import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import {
  buildReturnPendingOrderUpdate,
  isPostInboundOrderStatus,
  wasInboundOrder,
} from "@/lib/order-return-flow";
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
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

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

    // 유효한 상태값 확인 (order_status enum 과 일치)
    const validStatuses = [
      "PENDING", "PAID", "BOOKED", "INBOUND", "PROCESSING", "HOLD",
      "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED",
      "RETURN_PENDING", "RETURN_SHIPPING", "RETURN_DONE",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 상태값입니다: ${status}` },
        { status: 400 }
      );
    }

    // 상태 전이 허용 맵: 현재 상태 → 이동 가능한 다음 상태들 (order_status enum 기준)
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      PENDING:          ["PAID", "CANCELLED"],
      PAID:             ["BOOKED", "CANCELLED"],
      BOOKED:           ["INBOUND", "CANCELLED"],
      INBOUND:          ["PROCESSING", "HOLD", "CANCELLED"],
      PROCESSING:       ["HOLD", "READY_TO_SHIP", "CANCELLED"],
      HOLD:             ["PROCESSING", "READY_TO_SHIP", "CANCELLED"],
      READY_TO_SHIP:    ["OUT_FOR_DELIVERY", "PROCESSING", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "READY_TO_SHIP"],
      DELIVERED:        ["RETURN_SHIPPING"],
      CANCELLED:        [],
      RETURN_PENDING:   ["RETURN_SHIPPING", "CANCELLED"],
      RETURN_SHIPPING:  ["RETURN_DONE"],
      RETURN_DONE:      [],
    };

    // 현재 주문 상태 조회 (역행 방지 검증용)
    const { data: current, error: currentError } = await supabase
      .from("orders")
      .select("status, extra_charge_data, tracking_no, canceled_at, cancellation_reason")
      .eq("id", orderId)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { success: false, error: "주문 정보를 조회할 수 없습니다." },
        { status: 404 }
      );
    }

    const { data: shipmentRaw } = await supabase
      .from("shipments")
      .select("status, pickup_tracking_no")
      .eq("order_id", orderId)
      .maybeSingle();

    // inbound_at 은 DB에 존재하지만 생성 타입에 없어 raw query 결과에서 직접 추출
    const shipmentAny = shipmentRaw as any;
    const shipment = shipmentRaw
      ? { status: shipmentAny.status, inbound_at: shipmentAny.inbound_at ?? null, pickup_tracking_no: shipmentAny.pickup_tracking_no }
      : null;

    const orderContext = {
      status: current.status as string,
      extra_charge_data: current.extra_charge_data as { returnTrackingNo?: string } | null,
      tracking_no: current.tracking_no,
      canceled_at: current.canceled_at,
      cancellation_reason: current.cancellation_reason,
      shipment,
    };

    const currentStatus = current.status as string;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    let targetStatus = status;
    if (status === "CANCELLED" && isPostInboundOrderStatus(currentStatus)) {
      targetStatus = "RETURN_PENDING";
    }

    const legacyReturnRepair =
      currentStatus === "CANCELLED" &&
      status === "RETURN_PENDING" &&
      wasInboundOrder(orderContext);

    if (
      allowed !== undefined &&
      !allowed.includes(status) &&
      !(status === "CANCELLED" && targetStatus === "RETURN_PENDING") &&
      !legacyReturnRepair
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `상태 전이가 허용되지 않습니다: ${currentStatus} → ${status}`,
          allowedTransitions: allowed,
        },
        { status: 400 }
      );
    }

    const orderUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (
      targetStatus === "RETURN_PENDING" &&
      (status === "CANCELLED" || legacyReturnRepair || isPostInboundOrderStatus(currentStatus))
    ) {
      Object.assign(
        orderUpdate,
        buildReturnPendingOrderUpdate(current.extra_charge_data as Record<string, unknown> | null, {
          reason:
            (current.cancellation_reason as string) ||
            (legacyReturnRepair
              ? "입고 후 취소 주문 — 반송 처리 시작"
              : "관리자 상태 변경 — 입고 후 취소 (반송 필요)"),
          source: legacyReturnRepair ? "ADMIN_RETURN_PENDING" : "ADMIN_STATUS_CANCEL",
        })
      );
      if (current.canceled_at) {
        orderUpdate.canceled_at = current.canceled_at;
      }
    } else if (targetStatus === "RETURN_PENDING") {
      Object.assign(
        orderUpdate,
        buildReturnPendingOrderUpdate(current.extra_charge_data as Record<string, unknown> | null, {
          reason: "관리자 반송 대기 처리",
          source: "ADMIN_RETURN_PENDING",
        })
      );
    } else {
      orderUpdate.status = targetStatus;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update(orderUpdate)
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

    // 2. 송장 상태도 변경 (shipment_status enum 에 존재하는 값만 동기화)
    //    order_status 전용 값(PAID/HOLD/RETURN_* 등)은 shipments 로 전파하지 않는다.
    const SHIPMENT_SYNC_STATUSES = [
      "BOOKED", "PICKED_UP", "INBOUND", "PROCESSING",
      "READY_TO_SHIP", "OUT_FOR_DELIVERY", "DELIVERED",
    ];
    if (SHIPMENT_SYNC_STATUSES.includes(targetStatus)) {
      const { error: shipmentError } = await supabase
        .from("shipments")
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);

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
          newStatus: targetStatus,
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


