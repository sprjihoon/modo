import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 테스트용 시크릿 키 (실제 운영시 환경변수로 변경)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentConfirmRequest = await request.json();
    const { paymentKey, orderId, amount } = body;

    // 필수 파라미터 검증
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 서버에 저장된 주문 정보와 금액 일치 여부 확인 (데이터 무결성 검증)
    // extra_charge_requests 테이블에서 주문 정보 조회
    const { data: orderData, error: orderError } = await supabase
      .from("extra_charge_requests")
      .select("*")
      .eq("id", orderId)
      .single();

    // 주문이 없으면 일반 orders 테이블에서 조회
    let isExtraCharge = !!orderData;
    let originalAmount = orderData?.amount;
    
    if (!orderData) {
      const { data: normalOrder, error: normalOrderError } = await supabase
        .from("orders")
        .select("id, total_price")
        .eq("id", orderId)
        .single();

      if (normalOrderError || !normalOrder) {
        return NextResponse.json(
          { error: "ORDER_NOT_FOUND", message: "주문 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      originalAmount = normalOrder.total_price;
      isExtraCharge = false;
    }

    // 금액 검증 (클라이언트에서 조작 방지)
    if (originalAmount && originalAmount !== amount) {
      return NextResponse.json(
        { error: "AMOUNT_MISMATCH", message: "결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 토스페이먼츠 결제 승인 API 호출
    // Basic 인증: base64(시크릿키 + ":")
    const encodedSecretKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");

    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error("토스페이먼츠 결제 승인 실패:", tossData);
      return NextResponse.json(
        { 
          error: tossData.code || "PAYMENT_FAILED", 
          message: tossData.message || "결제 승인에 실패했습니다." 
        },
        { status: tossResponse.status }
      );
    }

    // 결제 성공 시 DB 업데이트
    if (isExtraCharge) {
      // 추가 비용 결제인 경우
      const { error: updateError } = await supabase
        .from("extra_charge_requests")
        .update({
          status: "PAID",
          payment_key: paymentKey,
          customer_response_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("DB 업데이트 실패:", updateError);
        // 결제는 성공했지만 DB 업데이트 실패 - 로깅하고 성공 응답
      }

      // 작업자에게 알림 전송
      if (orderData?.worker_id) {
        await supabase.from("notifications").insert({
          user_id: orderData.worker_id,
          type: "EXTRA_CHARGE_RESPONSE",
          title: "추가 비용 결제 완료",
          body: `고객이 추가 비용 ${amount.toLocaleString()}원을 결제했습니다.`,
          metadata: {
            requestId: orderId,
            orderId: orderData.order_id,
            paymentKey,
          },
        });
      }
    } else {
      // 일반 주문 결제인 경우
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "PAID",
          payment_key: paymentKey,
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("주문 업데이트 실패:", updateError);
      }
    }

    // 결제 내역 저장 (별도 테이블이 있다면)
    try {
      await supabase.from("payment_logs").insert({
        order_id: isExtraCharge ? orderData?.order_id : orderId,
        payment_key: paymentKey,
        amount: tossData.totalAmount,
        method: tossData.method,
        status: "SUCCESS",
        provider: "TOSS",
        response_data: tossData,
        approved_at: tossData.approvedAt,
      });
    } catch (logError) {
      // 로그 저장 실패는 무시
      console.log("결제 로그 저장 실패 (테이블이 없을 수 있음):", logError);
    }

    // 클라이언트에 결제 정보 반환
    return NextResponse.json({
      success: true,
      orderId: tossData.orderId,
      paymentKey: tossData.paymentKey,
      method: tossData.method,
      totalAmount: tossData.totalAmount,
      approvedAt: tossData.approvedAt,
      receipt: tossData.receipt,
      card: tossData.card,
      virtualAccount: tossData.virtualAccount,
      transfer: tossData.transfer,
    });
  } catch (error: any) {
    console.error("결제 승인 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

