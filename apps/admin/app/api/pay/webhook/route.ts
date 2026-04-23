import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 토스페이먼츠 웹훅 이벤트 타입
 * - PAYMENT_STATUS_CHANGED: 결제 상태 변경
 * - DEPOSIT_CALLBACK: 가상계좌 입금 완료
 * - CANCEL_STATUS_CHANGED: 결제 취소 상태 변경
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

/**
 * 웹훅 URL 시크릿 토큰 검증
 * 토스 개발자센터에서 웹훅 URL을 ?secret=XXX 형태로 등록하거나
 * Authorization 헤더에 Bearer 토큰을 담아 검증
 */
function verifyWebhookSecret(request: NextRequest): boolean {
  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // 환경변수 미설정 시 경고 후 통과 (설정 전 개발 환경 대응)
    console.warn("⚠️ TOSS_WEBHOOK_SECRET이 설정되지 않았습니다. 웹훅 시크릿 검증을 건너뜁니다.");
    return true;
  }

  // URL 쿼리 파라미터로 시크릿 검증 (?webhook_secret=XXX)
  const urlSecret = request.nextUrl.searchParams.get("webhook_secret");
  if (urlSecret && urlSecret === webhookSecret) return true;

  // Authorization 헤더로 시크릿 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${webhookSecret}`) return true;

  return false;
}

export async function POST(request: NextRequest) {
  try {
    // 1. 웹훅 시크릿 토큰 검증
    if (!verifyWebhookSecret(request)) {
      console.warn("⛔ 웹훅 시크릿 검증 실패 - 허가되지 않은 요청");
      // 토스 재시도 방지를 위해 200 반환하지 않고 401 반환
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload: TossWebhookPayload = await request.json();
    
    console.log("🔔 토스페이먼츠 웹훅 수신:", payload.eventType, payload.data?.orderId);

    // 웹훅은 Toss 서버에서 오므로 사용자 세션 없음 → service role 클라이언트 사용
    const supabase = getSupabaseAdmin();
    const { eventType, data, createdAt } = payload;

    // 웹훅 로그 저장 (raw: DB 스키마의 실제 컬럼에 맞춰 저장)
    try {
      await (supabase as any).from("webhook_logs").insert({
        provider: "TOSS",
        event_type: eventType,
        raw: payload,
        received_at: createdAt,
        order_id: data?.orderId ?? null,
        payment_key: data?.paymentKey ?? null,
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

      case "CANCEL_STATUS_CHANGED":
        // 결제 취소 상태 변경 처리
        await handleCancelStatusChanged(supabase, data);
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
    // 5xx를 반환하면 토스가 최대 7회 재시도(3일 19시간) → 일시적 오류에 유리
    // 단, 파싱 오류 등 재시도해도 의미없는 경우엔 200을 반환해 재시도 방지
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * 가상계좌 입금 완료 처리
 * DEPOSIT_CALLBACK 이벤트: data.secret 값을 DB에 저장된 값과 대조하여 2차 검증
 */
async function handleVirtualAccountDeposit(supabase: any, data: any) {
  const { orderId, paymentKey, secret } = data;

  if (!orderId) {
    console.error("orderId가 없습니다.");
    return;
  }

  // 가상계좌 secret 2차 검증
  // 결제 요청 시 저장한 virtual_account_secret 컬럼값과 비교
  if (secret) {
    const { data: order } = await supabase
      .from("orders")
      .select("virtual_account_secret")
      .eq("id", orderId)
      .single();

    if (order?.virtual_account_secret && order.virtual_account_secret !== secret) {
      console.error(`⛔ 가상계좌 secret 불일치 orderId=${orderId}`);
      return; // 위조된 요청 무시
    }
  }

  console.log(`💰 가상계좌 입금 완료: orderId=${orderId}`);

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

/**
 * 결제 취소 상태 변경 처리
 * CANCEL_STATUS_CHANGED 이벤트: 취소 요청 상태 변경 (DONE → 취소 완료)
 */
async function handleCancelStatusChanged(supabase: any, data: any) {
  const { paymentKey, orderId, status, transactionKey } = data;

  console.log(`❌ 취소 상태 변경: orderId=${orderId}, status=${status}`);

  if (!orderId) {
    console.error("orderId가 없습니다.");
    return;
  }

  // orders 테이블 취소 상태 업데이트
  const { error } = await supabase
    .from("orders")
    .update({
      payment_status: "CANCELED",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("취소 상태 업데이트 실패:", error);
  }

  // extra_charge_requests도 취소 처리
  await supabase
    .from("extra_charge_requests")
    .update({ status: "CANCELED" })
    .eq("id", orderId);

  // 결제 로그 업데이트
  try {
    if (paymentKey) {
      await supabase
        .from("payment_logs")
        .update({ status: "CANCELED" })
        .eq("payment_key", paymentKey);
    }
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
      "CANCEL_STATUS_CHANGED - 결제 취소 상태 변경",
      "PAYOUT_STATUS_CHANGED - 지급대행 상태 변경",
    ],
  });
}

