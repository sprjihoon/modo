import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 정책: 추가요금 거절 → 반송(RETURN) 시 자동 부분환불
// 환불액 = total_price - returnFee (왕복 배송비, 기본 6,000원)
const DEFAULT_RETURN_FEE = 6000;

function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  return createSupabaseClient(url, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 사용자가 추가요금 요청을 거절하고 반송(RETURN)을 선택했을 때 호출.
 *
 * 1. 본인 주문 + extra_charge_status 가 PENDING_CUSTOMER 인지 검증
 * 2. process_customer_decision RPC 호출 → extra_charge_status = RETURN_REQUESTED, status = RETURN_PENDING
 * 3. Toss /v1/payments/{paymentKey}/cancel 호출 with cancelAmount = total - returnFee (부분환불)
 * 4. orders.payment_status = PARTIAL_CANCELED, canceled_at, cancellation_reason 기록
 * 5. payment_logs 기록
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, status, payment_status, payment_key, total_price, user_id, extra_charge_status, extra_charge_data")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (order.user_id !== userRow.id) {
      return NextResponse.json(
        { success: false, error: "본인 주문만 처리할 수 있습니다." },
        { status: 403 }
      );
    }

    if (order.extra_charge_status !== "PENDING_CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          error: "추가 결제 대기 상태가 아닌 주문입니다.",
          currentStatus: order.extra_charge_status,
        },
        { status: 400 }
      );
    }

    const totalPrice = Number(order.total_price ?? 0);
    const returnFee =
      Number(
        (order.extra_charge_data as { returnFee?: number } | null)?.returnFee ??
          DEFAULT_RETURN_FEE
      ) || DEFAULT_RETURN_FEE;
    const refundAmount = Math.max(totalPrice - returnFee, 0);

    // 1) RPC로 상태 전이 (process_customer_decision)
    const { error: rpcErr } = await admin.rpc("process_customer_decision", {
      p_order_id: orderId,
      p_action: "RETURN",
      p_customer_id: userRow.id,
    });
    if (rpcErr) {
      console.error("process_customer_decision RETURN error:", rpcErr);
      return NextResponse.json(
        { success: false, error: rpcErr.message || "반송 처리 실패" },
        { status: 500 }
      );
    }

    // 2) Toss 부분환불 (결제 정보가 유효할 때만)
    const paymentKey = order.payment_key as string | null;
    let refundResult: Record<string, unknown> | null = null;
    let refundError: string | null = null;

    if (paymentKey && refundAmount > 0) {
      try {
        const encodedKey = Buffer.from(`${getTossSecretKey()}:`).toString("base64");
        const tossRes = await fetch(
          `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encodedKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cancelReason: `반송 처리 - 왕복 배송비 ${returnFee.toLocaleString()}원 차감`,
              cancelAmount: refundAmount,
            }),
          }
        );
        const tossData = await tossRes.json();

        if (!tossRes.ok) {
          refundError = tossData?.message || "부분환불 실패";
          console.error("Toss partial cancel failed:", tossData);
        } else {
          refundResult = tossData;
          await admin
            .from("orders")
            .update({
              payment_status: "PARTIAL_CANCELED",
              canceled_at: new Date().toISOString(),
              cancellation_reason: `반송 - 왕복 배송비 ${returnFee}원 차감`,
            })
            .eq("id", orderId);

          try {
            await admin.from("payment_logs").insert({
              order_id: orderId,
              payment_key: paymentKey,
              amount: refundAmount,
              status: "PARTIAL_CANCELED",
              provider: "TOSS",
              response_data: tossData,
            });
          } catch {
            /* 로그 실패 무시 */
          }
        }
      } catch (e) {
        refundError = e instanceof Error ? e.message : String(e);
      }
    } else if (!paymentKey) {
      refundError = "결제 정보(payment_key)가 없어 환불 처리되지 않았습니다.";
    }

    return NextResponse.json({
      success: true,
      message: refundResult
        ? `반송 요청 완료. 왕복 배송비 ${returnFee.toLocaleString()}원을 차감하고 ${refundAmount.toLocaleString()}원이 환불됩니다.`
        : `반송 요청 완료. 환불 금액(${refundAmount.toLocaleString()}원)은 별도 처리됩니다.`,
      returnFee,
      refundAmount,
      refundProcessed: !!refundResult,
      refundError,
    });
  } catch (e) {
    console.error("반송 + 환불 처리 오류:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "반송 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
