/**
 * 토스페이먼츠 웹훅 엔드포인트
 *
 * 토스페이먼츠 개발자센터 > 웹훅 URL 등록:
 *   https://modo.io.kr/api/pay/webhook
 *
 * 처리 이벤트:
 *   - PAYMENT_STATUS_CHANGED : 가상계좌 입금 완료 등 결제 상태 변경
 *   - DEPOSIT_CALLBACK       : 가상계좌 입금 콜백 (레거시)
 *
 * 토스페이먼츠는 웹훅 시크릿을 별도로 제공하지 않으므로
 * paymentKey로 토스 API에 재조회하여 실제 상태를 검증한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  return createClient(url, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

async function fetchTossPayment(paymentKey: string) {
  const encoded = Buffer.from(`${getTossSecretKey()}:`).toString("base64");
  const res = await fetch(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    { headers: { Authorization: `Basic ${encoded}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { eventType, createdAt, data } = body as {
      eventType?: string;
      createdAt?: string;
      data?: { paymentKey?: string; orderId?: string; status?: string };
    };

    const paymentKey = data?.paymentKey;
    const tossOrderId = data?.orderId;

    if (!paymentKey || !tossOrderId) {
      return NextResponse.json({ error: "paymentKey or orderId missing" }, { status: 400 });
    }

    console.log(`[webhook] eventType=${eventType} orderId=${tossOrderId} paymentKey=${paymentKey} createdAt=${createdAt}`);

    // 토스 API로 실제 상태 재확인 (위변조 방지)
    const payment = await fetchTossPayment(paymentKey);
    if (!payment) {
      console.error("[webhook] 토스 결제 조회 실패:", paymentKey);
      return NextResponse.json({ error: "결제 조회 실패" }, { status: 400 });
    }

    const actualStatus: string = payment.status;
    const admin = getSupabaseAdmin();

    // UUID 추출 (orderId가 UUID 또는 MODO_<uuid>_* 형태일 수 있음)
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = tossOrderId.match(UUID_RE);
    const dbOrderId = match ? match[0] : null;

    if (!dbOrderId) {
      console.warn("[webhook] UUID 추출 불가 — orderId:", tossOrderId);
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 가상계좌 입금 완료
    if (actualStatus === "DONE" || actualStatus === "PAID") {
      const { error } = await admin
        .from("orders")
        .update({
          payment_status: "PAID",
          status: "PAID",
          payment_key: paymentKey,
          paid_at: payment.approvedAt ?? new Date().toISOString(),
        })
        .eq("id", dbOrderId)
        .in("payment_status", ["WAITING_FOR_DEPOSIT", "PENDING"]);

      if (error) {
        console.error("[webhook] DB 업데이트 실패:", error);
      } else {
        console.log("[webhook] 가상계좌 입금 완료 처리:", dbOrderId);
      }

      // 결제 로그 기록
      try {
        await admin.from("payment_logs").insert({
          order_id: dbOrderId,
          payment_key: paymentKey,
          amount: payment.totalAmount,
          method: payment.method,
          status: "SUCCESS",
          provider: "TOSS",
          response_data: payment,
          approved_at: payment.approvedAt,
        });
      } catch { /* 로그 테이블 미존재 시 무시 */ }
    }

    // 결제 취소/실패 동기화
    if (actualStatus === "CANCELED" || actualStatus === "ABORTED" || actualStatus === "EXPIRED") {
      await admin
        .from("orders")
        .update({ payment_status: "CANCELED" })
        .eq("id", dbOrderId)
        .eq("payment_key", paymentKey);

      console.log(`[webhook] 결제 취소/만료 동기화: ${dbOrderId} → ${actualStatus}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] 처리 오류:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}
