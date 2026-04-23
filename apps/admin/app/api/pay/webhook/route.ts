import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 웹훅 시크릿 키 (토스페이먼츠 개발자센터에서 설정)
const WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET || "";

/**
 * 토스페이먼츠 웹훅 이벤트 타입
 * - PAYMENT_STATUS_CHANGED: 결제 상태 변경
 * - DEPOSIT_CALLBACK: 가상계좌 입금 완료
 * - PAYOUT_STATUS_CHANGED: 지급대행 상태 변경
 */
interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    transactionKey?: string;
    secret?: string;
    // 가상계좌 입금 관련
    accountNumber?: string;
    bank?: string;
    customerName?: string;
    dueDate?: string;
    // 결제 정보
    totalAmount?: number;
    method?: string;
    approvedAt?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: TossWebhookPayload = await request.json();
    
    console.log("🔔 토스페이먼츠 웹훅 수신:", JSON.stringify(payload, null, 2));

    const supabase = await createClient();
    const { eventType, data, createdAt } = payload;

    // 웹훅 로그 저장
    try {
      await supabase.from("webhook_logs").insert({
        provider: "TOSS",
        event_type: eventType,
        payload: payload,
        received_at: createdAt,
      });
    } catch (logError) {
      console.log("웹훅 로그 저장 실패 (테이블이 없을 수 있음):", logError);
    }

    switch (eventType) {
      case "DEPOSIT_CALLBACK":
        // 가상계좌 입금 완료 처리
        await handleVirtualAccountDeposit(supabase, data);
        break;

      case "PAYMENT_STATUS_CHANGED":
        // 결제 상태 변경 처리
        await handlePaymentStatusChanged(supabase, data);
        break;

      case "PAYOUT_STATUS_CHANGED":
        // 지급대행 상태 변경 (필요시 구현)
        console.log("지급대행 상태 변경:", data);
        break;

      default:
        console.log("알 수 없는 웹훅 이벤트:", eventType);
    }

    // 토스페이먼츠는 200 OK 응답을 받아야 재시도하지 않음
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("웹훅 처리 오류:", error);
    // 에러가 발생해도 200을 반환하여 무한 재시도 방지
    // 실제 운영에서는 에러 로깅 후 수동 처리 필요
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * 가상계좌 입금 완료 처리
 */
async function handleVirtualAccountDeposit(supabase: any, data: any) {
  const { orderId, paymentKey, secret } = data;

  if (!orderId) {
    console.error("orderId가 없습니다.");
    return;
  }

  // 가상계좌의 경우 secret 값 검증 (보안)
  // 결제 요청 시 저장해둔 secret과 비교해야 함
  
  console.log(`💰 가상계좌 입금 완료: orderId=${orderId}, paymentKey=${paymentKey}`);

  // extra_charge_requests 테이블 업데이트
  const { data: extraChargeReq, error: extraError } = await supabase
    .from("extra_charge_requests")
    .update({
      status: "PAID",
      payment_key: paymentKey,
      customer_response_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*, orders(user_id)")
    .single();

  if (!extraError && extraChargeReq) {
    // 알림 전송
    if (extraChargeReq.worker_id) {
      await supabase.from("notifications").insert({
        user_id: extraChargeReq.worker_id,
        type: "VIRTUAL_ACCOUNT_DEPOSIT",
        title: "가상계좌 입금 완료",
        body: `주문 ${orderId}의 가상계좌 입금이 완료되었습니다.`,
        metadata: { orderId, paymentKey },
      });
    }
    return;
  }

  // 일반 orders 테이블 업데이트
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: "PAID",
      payment_key: paymentKey,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (orderError) {
    console.error("주문 업데이트 실패:", orderError);
  }
}

/**
 * 결제 상태 변경 처리
 */
async function handlePaymentStatusChanged(supabase: any, data: any) {
  const { orderId, paymentKey, status } = data;

  console.log(`📝 결제 상태 변경: orderId=${orderId}, status=${status}`);

  // 상태에 따른 처리
  switch (status) {
    case "DONE":
      // 결제 완료
      break;
    case "CANCELED":
      // 결제 취소됨
      await supabase
        .from("orders")
        .update({ payment_status: "CANCELED" })
        .eq("id", orderId);
      break;
    case "PARTIAL_CANCELED":
      // 부분 취소됨
      await supabase
        .from("orders")
        .update({ payment_status: "PARTIAL_CANCELED" })
        .eq("id", orderId);
      break;
    case "EXPIRED":
      // 결제 만료 (가상계좌 입금 기한 만료 등)
      await supabase
        .from("orders")
        .update({ payment_status: "EXPIRED" })
        .eq("id", orderId);
      break;
    default:
      console.log("처리되지 않은 상태:", status);
  }

  // 결제 로그 업데이트
  try {
    await supabase
      .from("payment_logs")
      .update({ status })
      .eq("payment_key", paymentKey);
  } catch (e) {
    // 테이블이 없을 수 있음
  }
}

// GET 요청 처리 (웹훅 테스트용)
export async function GET() {
  return NextResponse.json({
    message: "토스페이먼츠 웹훅 엔드포인트입니다.",
    endpoint: "/api/pay/webhook",
    supportedEvents: [
      "DEPOSIT_CALLBACK - 가상계좌 입금 완료",
      "PAYMENT_STATUS_CHANGED - 결제 상태 변경",
      "PAYOUT_STATUS_CHANGED - 지급대행 상태 변경",
    ],
  });
}

