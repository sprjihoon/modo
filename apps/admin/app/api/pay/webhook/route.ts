/**
 * 포트원 V2 웹훅 엔드포인트 (어드민)
 *
 * 포트원 콘솔에서 웹훅 URL 등록:
 *   https://admin.modo.mom/api/pay/webhook
 *
 * 포트원 V2 이벤트:
 *   - Transaction.Paid
 *   - Transaction.VirtualAccountIssued
 *   - Transaction.Cancelled
 *   - Transaction.PartialCancelled
 *   - Transaction.Failed
 */
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    console.log(`[admin webhook] type=${type} paymentId=${paymentId}`);

    const supabase = getSupabaseAdmin();

    try {
      await (supabase as any).from("webhook_logs").insert({
        provider: "PORTONE",
        event_type: type,
        raw: body,
        received_at: new Date().toISOString(),
        payment_id: paymentId ?? null,
      });
    } catch (e) {
      console.log("웹훅 로그 저장 실패:", e);
    }

    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const payment = await fetchPortonePayment(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "결제 조회 실패" }, { status: 400 });
    }

    switch (type) {
      case "Transaction.Paid": {
        await (supabase as any)
          .from("orders")
          .update({
            payment_status: "PAID",
            status: "PAID",
            payment_id: paymentId,
            paid_at: payment.paidAt ?? new Date().toISOString(),
          })
          .eq("payment_id", paymentId)
          .in("payment_status", ["WAITING_FOR_DEPOSIT", "PENDING"]);

        const { data: extraChargeReq } = await (supabase as any)
          .from("extra_charge_requests")
          .update({
            status: "PAID",
            payment_id: paymentId,
            customer_response_at: payment.paidAt ?? new Date().toISOString(),
          })
          .eq("id", paymentId)
          .select("*, orders(user_id)")
          .single();

        if (extraChargeReq?.worker_id) {
          await (supabase as any).from("notifications").insert({
            user_id: extraChargeReq.worker_id,
            type: "VIRTUAL_ACCOUNT_DEPOSIT",
            title: "가상계좌 입금 완료",
            body: `가상계좌 입금이 완료되었습니다.`,
            metadata: { paymentId },
          });
        }
        break;
      }

      case "Transaction.VirtualAccountIssued": {
        await (supabase as any)
          .from("orders")
          .update({ payment_status: "WAITING_FOR_DEPOSIT", payment_id: paymentId })
          .eq("payment_id", paymentId);
        break;
      }

      case "Transaction.Cancelled":
      case "Transaction.PartialCancelled": {
        const newPaymentStatus = type === "Transaction.PartialCancelled" ? "PARTIAL_CANCELED" : "CANCELED";
        const orderUpdate: Record<string, unknown> = {
          payment_status: newPaymentStatus,
          canceled_at: new Date().toISOString(),
        };
        // 전체 취소 시 주문 상태도 CANCELLED로 변경
        if (type === "Transaction.Cancelled") {
          orderUpdate.status = "CANCELLED";
        }
        await (supabase as any)
          .from("orders")
          .update(orderUpdate)
          .eq("payment_id", paymentId);
        await (supabase as any)
          .from("extra_charge_requests")
          .update({ status: "CANCELED" })
          .eq("id", paymentId);
        break;
      }

      case "Transaction.Failed": {
        await (supabase as any)
          .from("orders")
          .update({ payment_status: "FAILED" })
          .eq("payment_id", paymentId);
        break;
      }

      default:
        console.log("[admin webhook] 처리되지 않은 이벤트:", type);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[admin webhook] 처리 오류:", e);
    return NextResponse.json(
      { error: (e as Error).message || "서버 오류" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "포트원 V2 웹훅 엔드포인트입니다.",
    endpoint: "/api/pay/webhook",
    supportedEvents: [
      "Transaction.Paid - 결제 완료",
      "Transaction.VirtualAccountIssued - 가상계좌 발급",
      "Transaction.Cancelled - 결제 취소",
      "Transaction.PartialCancelled - 부분 취소",
      "Transaction.Failed - 결제 실패",
    ],
  });
}
