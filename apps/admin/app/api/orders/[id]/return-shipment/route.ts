import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 우체국 API를 통한 송장 생성 (기존 배송 송장 생성 로직 참조)
async function createReturnWaybill(orderId: string, returnFee: number) {
  // TODO: 실제 우체국 API 연동
  // 현재는 테스트용 송장번호 생성
  const timestamp = Date.now();
  const trackingNo = `R${timestamp.toString().slice(-12)}`;
  
  // 라벨 URL은 우체국 API에서 반환받거나, 자체 생성
  const labelUrl = `/api/labels/return/${trackingNo}`;
  
  return {
    trackingNo,
    labelUrl,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { returnFee = 6000 } = await request.json();

    // 1. 주문 조회
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, extra_charge_status, extra_charge_data, user_id, item_name, order_number")
      .eq("id", params.id)
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

    // 4. 우체국 API를 통해 반송 송장 생성
    const { trackingNo, labelUrl } = await createReturnWaybill(params.id, returnFee);

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
        status: "RETURN_SHIPPING", // 반송 배송중 상태로 변경
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

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
          orderId: params.id,
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
            orderId: params.id,
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

