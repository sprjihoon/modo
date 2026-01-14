import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 토스페이먼츠 시크릿 키 (환경변수 필수)
function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) {
    throw new Error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

interface CancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 취소 시 금액 (전액 취소 시 생략)
  refundReceiveAccount?: {
    // 가상계좌 환불 계좌 (가상계좌 결제 취소 시 필수)
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

/**
 * 토스페이먼츠 결제 취소 API
 * 
 * 사용 예시:
 * POST /api/pay/cancel
 * {
 *   "paymentKey": "tgen_20240101...",
 *   "cancelReason": "고객 요청에 의한 취소",
 *   "cancelAmount": 5000  // 부분 취소 시 (선택)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CancelRequest = await request.json();
    const { paymentKey, cancelReason, cancelAmount, refundReceiveAccount } = body;

    // 필수 파라미터 검증
    if (!paymentKey) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "paymentKey가 필요합니다." },
        { status: 400 }
      );
    }

    if (!cancelReason) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "취소 사유(cancelReason)가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Basic 인증 헤더 생성
    const encodedSecretKey = Buffer.from(`${getTossSecretKey()}:`).toString("base64");

    // 토스페이먼츠 결제 취소 API 호출
    const cancelBody: any = {
      cancelReason,
    };

    // 부분 취소인 경우 금액 추가
    if (cancelAmount) {
      cancelBody.cancelAmount = cancelAmount;
    }

    // 가상계좌 환불 계좌 정보
    if (refundReceiveAccount) {
      cancelBody.refundReceiveAccount = refundReceiveAccount;
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelBody),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error("토스페이먼츠 결제 취소 실패:", tossData);
      return NextResponse.json(
        {
          error: tossData.code || "CANCEL_FAILED",
          message: tossData.message || "결제 취소에 실패했습니다.",
        },
        { status: tossResponse.status }
      );
    }

    console.log("✅ 결제 취소 성공:", tossData.orderId);

    // DB 업데이트
    const orderId = tossData.orderId;
    const isTotalCancel = !cancelAmount || cancelAmount === tossData.totalAmount;
    const newStatus = isTotalCancel ? "CANCELED" : "PARTIAL_CANCELED";

    // extra_charge_requests 업데이트 시도
    const { data: extraChargeReq } = await supabase
      .from("extra_charge_requests")
      .update({
        status: newStatus,
        canceled_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    // 일반 orders 업데이트
    if (!extraChargeReq) {
      await supabase
        .from("orders")
        .update({
          payment_status: newStatus,
          canceled_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    // 취소 로그 저장
    try {
      await supabase.from("payment_logs").insert({
        order_id: orderId,
        payment_key: paymentKey,
        amount: cancelAmount || tossData.totalAmount,
        status: "CANCELED",
        provider: "TOSS",
        response_data: tossData,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.log("취소 로그 저장 실패:", logError);
    }

    // 응답
    return NextResponse.json({
      success: true,
      orderId: tossData.orderId,
      paymentKey: tossData.paymentKey,
      status: tossData.status,
      canceledAmount: tossData.cancels?.[0]?.cancelAmount,
      canceledAt: tossData.cancels?.[0]?.canceledAt,
      cancelReason: tossData.cancels?.[0]?.cancelReason,
      totalAmount: tossData.totalAmount,
      balanceAmount: tossData.balanceAmount, // 남은 금액 (부분취소 시)
    });
  } catch (error: any) {
    console.error("결제 취소 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

