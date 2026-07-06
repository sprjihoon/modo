/**
 * 포트원 V2 웹훅 엔드포인트
 *
 * 포트원 콘솔 > 결제 연동 > 연동 관리 > 결제알림(Webhook) 관리에서 등록:
 *   https://modo.io.kr/api/pay/webhook
 *
 * 포트원 V2 웹훅 이벤트:
 *   - Transaction.Paid             : 결제 승인
 *   - Transaction.VirtualAccountIssued : 가상계좌 발급
 *   - Transaction.Cancelled        : 결제 취소
 *   - Transaction.PartialCancelled : 부분 취소
 *   - Transaction.Failed           : 결제 실패
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

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

async function fetchPortonePayment(paymentId: string) {
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${getPortoneApiSecret()}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

    // 웹훅 시그니처 검증 (포트원 Standard Webhooks)
    if (webhookSecret) {
      try {
        const { Webhook } = await import("@portone/server-sdk");
        await Webhook.verify(webhookSecret, rawBody, Object.fromEntries(request.headers));
      } catch (e) {
        console.warn("포트원 웹훅 시그니처 검증 실패:", e);
        return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
      }
    }

    const type = body.type as string | undefined;
    const data = body.data as Record<string, unknown> | undefined;
    const paymentId = data?.paymentId as string | undefined;

    console.log(`[webhook] type=${type} paymentId=${paymentId}`);

    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 포트원 API로 실제 상태 재확인 (위변조 방지)
    const payment = await fetchPortonePayment(paymentId);
    if (!payment) {
      console.error("[webhook] 포트원 결제 조회 실패:", paymentId);
      return NextResponse.json({ error: "결제 조회 실패" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    switch (type) {
      case "Transaction.Paid": {
        const { data: updated, error } = await admin
          .from("orders")
          .update({
            payment_status: "PAID",
            status: "PAID",
            payment_id: paymentId,
            paid_at: payment.paidAt ?? payment.approvedAt ?? new Date().toISOString(),
          })
          .eq("payment_id", paymentId)
          .in("payment_status", ["WAITING_FOR_DEPOSIT", "PENDING"])
          .select("id");

        if (error) {
          console.error("[webhook] DB 업데이트 실패:", error);
        } else {
          console.log("[webhook] 결제 완료 처리:", paymentId);
        }

        // 🛟 고아 결제 안전망: PG 승인은 됐으나 주문이 존재하지 않는 경우
        //    (고객이 /payment/success 도달 전 이탈 → payments-confirm 미호출)
        //    canonical 한 payments-confirm 을 재호출해 intent 기반으로 주문을 생성한다.
        //    payments-confirm 은 intent.consumed_at 로 멱등 처리되므로 중복 생성되지 않는다.
        let orderExists = (updated?.length ?? 0) > 0;
        if (!orderExists) {
          const { data: existing } = await admin
            .from("orders")
            .select("id")
            .eq("payment_id", paymentId)
            .limit(1);
          orderExists = (existing?.length ?? 0) > 0;
        }

        // intent 기반 결제(주문 생성 흐름)만 대상: paymentId 가 32-hex 또는 UUID 형태
        const isIntentPayment =
          /^[0-9a-f]{32}$/i.test(paymentId) ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);

        if (!orderExists && isIntentPayment) {
          console.warn("[webhook] 고아 결제 감지 → 주문 자동 생성 시도:", paymentId);
          try {
            const { error: fnError } = await admin.functions.invoke("payments-confirm", {
              body: {
                payment_id: paymentId,
                order_id: paymentId,
                pickup_payload: { __from_intent: true },
              },
            });
            if (fnError) {
              console.error("[webhook] 고아 결제 주문 생성 실패:", fnError);
            } else {
              console.log("[webhook] 고아 결제 주문 자동 생성 완료:", paymentId);
            }
          } catch (e) {
            console.error("[webhook] 고아 결제 주문 생성 예외:", e);
          }
        }

        try {
          await admin.from("payment_logs").insert({
            payment_id: paymentId,
            amount: payment.amount?.total,
            method: payment.method?.type,
            status: "SUCCESS",
            provider: "PORTONE",
            response_data: payment,
            approved_at: payment.paidAt ?? payment.approvedAt,
          });
        } catch { /* 로그 실패 무시 */ }
        break;
      }

      case "Transaction.VirtualAccountIssued": {
        await admin
          .from("orders")
          .update({
            payment_status: "WAITING_FOR_DEPOSIT",
            payment_id: paymentId,
          })
          .eq("payment_id", paymentId);
        console.log("[webhook] 가상계좌 발급:", paymentId);
        break;
      }

      case "Transaction.Cancelled":
      case "Transaction.PartialCancelled": {
        const newStatus = type === "Transaction.PartialCancelled" ? "PARTIAL_CANCELED" : "CANCELED";
        await admin
          .from("orders")
          .update({ payment_status: newStatus, canceled_at: new Date().toISOString() })
          .eq("payment_id", paymentId);
        console.log(`[webhook] 결제 취소: ${paymentId} → ${newStatus}`);
        break;
      }

      case "Transaction.Failed": {
        await admin
          .from("orders")
          .update({ payment_status: "FAILED" })
          .eq("payment_id", paymentId);
        console.log("[webhook] 결제 실패:", paymentId);
        break;
      }

      default:
        // 알 수 없는 타입은 조용히 무시
        console.log("[webhook] 처리되지 않은 이벤트:", type);
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
