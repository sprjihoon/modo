import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { returnFee = 6000 } = await request.json();

    // 1. 주문 조회
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, extra_charge_status, extra_charge_data, user_id, item_name, order_number")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "주문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 2. 반송 요청 상태인지 확인
    if (order.extra_charge_status !== "RETURN_REQUESTED") {
      return NextResponse.json(
        { error: "반송 요청 상태가 아닙니다" },
        { status: 400 }
      );
    }

    // 3. 이미 반송 송장이 있는지 확인
    const existingReturnTracking = order.extra_charge_data?.returnTrackingNo;
    if (existingReturnTracking) {
      return NextResponse.json(
        { error: "이미 반송 송장이 생성되었습니다", trackingNo: existingReturnTracking },
        { status: 400 }
      );
    }

    // 4. shipments-create-outbound Edge Function을 통해 반송 송장 생성
    // isReturn: true → 추가 결제 체크 건너뜀, shipments 테이블 덮어쓰기 없음
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "shipments-create-outbound",
      { body: { orderId, isReturn: true } }
    );

    if (fnError || !fnData?.trackingNo) {
      console.error("반송 송장 Edge Function 오류:", fnError, fnData);
      return NextResponse.json(
        { error: fnData?.error || fnError?.message || "반송 송장 생성 실패" },
        { status: 500 }
      );
    }

    const trackingNo: string = fnData.trackingNo;
    const labelUrl: string = `/api/labels/return/${trackingNo}`;

    // 5. extra_charge_data 업데이트
    const updatedExtraChargeData = {
      ...order.extra_charge_data,
      returnTrackingNo: trackingNo,
      returnLabelUrl: labelUrl,
      returnFee: returnFee,
      returnCreatedAt: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        extra_charge_data: updatedExtraChargeData,
        status: "RETURN_SHIPPING" as any, // 반송 배송중 상태로 변경 (DB enum: 마이그레이션 후 유효)
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

    // 6. 고객에게 알림 전송
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

    // 7. 액션 로그 기록
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
      labelUrl,
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

