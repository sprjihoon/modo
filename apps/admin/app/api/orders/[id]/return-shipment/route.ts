import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildReturnPendingOrderUpdate,
  isPostInboundOrderStatus,
  isReturnWorkflowStatus,
  POST_INBOUND_SHIPMENT_STATUSES,
} from "@/lib/order-return-flow";

export const dynamic = 'force-dynamic';

async function canCreateReturnShipment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  order: {
    status: string;
    extra_charge_status: string | null;
    extra_charge_data: Record<string, unknown> | null;
  }
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (order.extra_charge_data?.returnTrackingNo) {
    return {
      ok: false,
      error: "이미 반송 송장이 생성되었습니다",
      status: 400,
    };
  }

  if (
    order.extra_charge_status === "RETURN_REQUESTED" ||
    isReturnWorkflowStatus(order.status)
  ) {
    return { ok: true };
  }

  if (isPostInboundOrderStatus(order.status)) {
    return { ok: true };
  }

  if (order.status === "CANCELLED") {
    const { data: shipment } = await supabase
      .from("shipments")
      .select("status, inbound_at")
      .eq("order_id", orderId)
      .maybeSingle();

    const wasInbound =
      !!shipment?.inbound_at ||
      (!!shipment?.status && POST_INBOUND_SHIPMENT_STATUSES.has(shipment.status));

    if (wasInbound) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    error: "입고 후 취소·반송 요청 상태에서만 반송 송장을 발급할 수 있습니다.",
    status: 400,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { returnFee = 6000 } = await request.json();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, extra_charge_status, extra_charge_data, user_id, item_name, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const eligibility = await canCreateReturnShipment(supabase, orderId, order);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error, trackingNo: order.extra_charge_data?.returnTrackingNo },
        { status: eligibility.status }
      );
    }

    // 입고 후 취소인데 아직 반송 워크플로우 필드가 없으면 먼저 세팅
    if (
      order.extra_charge_status !== "RETURN_REQUESTED" &&
      !isReturnWorkflowStatus(order.status)
    ) {
      const returnPendingUpdate = buildReturnPendingOrderUpdate(order.extra_charge_data, {
        reason: "관리자 반송 송장 발급 (입고 후 취소)",
        source: "ADMIN_RETURN_PENDING",
        returnFee,
      });

      const { error: prepareError } = await supabase
        .from("orders")
        .update(returnPendingUpdate)
        .eq("id", orderId);

      if (prepareError) {
        console.error("반송 대기 상태 전환 실패:", prepareError);
        return NextResponse.json(
          { error: "반송 대기 상태로 전환하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "shipments-create-outbound",
      { body: { orderId, isReturn: true } }
    );

    if (fnError || !fnData?.data?.trackingNo) {
      console.error("반송 송장 Edge Function 오류:", fnError, fnData);
      return NextResponse.json(
        { error: fnData?.error || fnData?.data?.error || fnError?.message || "반송 송장 생성 실패" },
        { status: 500 }
      );
    }

    const trackingNo: string = fnData.data.trackingNo;
    const returnDeliveryInfo = fnData.data.deliveryInfo ?? null;

    const { data: latestOrder } = await supabase
      .from("orders")
      .select("extra_charge_data")
      .eq("id", orderId)
      .single();

    const updatedExtraChargeData = {
      ...(latestOrder?.extra_charge_data ?? order.extra_charge_data ?? {}),
      returnTrackingNo: trackingNo,
      returnDeliveryInfo,
      returnFee,
      returnCreatedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        extra_charge_data: updatedExtraChargeData,
        extra_charge_status: "RETURN_REQUESTED",
        status: "RETURN_SHIPPING" as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("주문 업데이트 실패:", updateError);
      return NextResponse.json(
        { error: "송장 정보 저장 실패" },
        { status: 500 }
      );
    }

    if (order.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        type: "RETURN_SHIPMENT_CREATED",
        title: "반송 송장 발급",
        body: `'${order.item_name || "수선 의류"}' 상품의 반송이 준비되었습니다. 송장번호: ${trackingNo}`,
        metadata: {
          orderId: orderId,
          trackingNo: trackingNo,
        },
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", session.user.id)
        .single();

      if (user) {
        await supabase.from("action_logs").insert({
          actor_id: user.id,
          action_type: "CREATE_RETURN_SHIPMENT",
          details: {
            orderId: orderId,
            trackingNo: trackingNo,
            returnFee: returnFee,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      trackingNo,
      message: "반송 송장이 생성되었습니다",
    });
  } catch (error: any) {
    console.error("반송 송장 생성 실패:", error);
    return NextResponse.json(
      { error: error.message || "반송 송장 생성 실패" },
      { status: 500 }
    );
  }
}
