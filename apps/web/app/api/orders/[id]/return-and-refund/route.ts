import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// 정책: 추가요금 거절 → 반송(RETURN) 시 자동 부분환불.
// 환불액 = total_price - returnFee - orders.remote_area_fee
//
// - returnFee: 관리자 페이지의 반송 차감 배송비 (왕복).
//              extra_charge_data.returnFee 가 있으면 우선, 없으면
//              shipping_settings.return_shipping_fee 폴백.
// - remote_area_fee: 결제 시 이미 왕복(편도×2) 으로 저장된 도서산간 비용.
//                    "들어온 건 나가야 하니 무조건 왕복" 정책.
const DEFAULT_RETURN_FEE = 7000;

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
      .select(
        "id, status, payment_status, payment_key, total_price, remote_area_fee, user_id, extra_charge_status, extra_charge_data, item_name, order_number",
      )
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
    let returnFee =
      Number(
        (order.extra_charge_data as { returnFee?: number } | null)?.returnFee ??
          0,
      ) || 0;
    if (returnFee <= 0) {
      // shipping_settings 에서 동적 조회 (관리자 페이지 설정값과 동기화)
      try {
        const { data: settings } = await admin
          .from("shipping_settings")
          .select("return_shipping_fee")
          .eq("id", 1)
          .maybeSingle();
        const v = Number(
          (settings as { return_shipping_fee?: number } | null)?.return_shipping_fee,
        );
        if (Number.isFinite(v) && v > 0) returnFee = v;
      } catch {
        /* 폴백 */
      }
    }
    if (!Number.isFinite(returnFee) || returnFee <= 0) returnFee = DEFAULT_RETURN_FEE;
    // 도서산간 차감액: orders.remote_area_fee 컬럼은 결제 시 이미 왕복(편도×2)으로
    // 저장된 값이므로 별도 ×2 없이 그대로 더한다.
    const remoteAreaFee = Math.max(
      0,
      Number((order as { remote_area_fee: number | null }).remote_area_fee ?? 0) || 0,
    );
    const totalDeduction = returnFee + remoteAreaFee;
    const refundAmount = Math.max(totalPrice - totalDeduction, 0);

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
    // - paymentKey 가 없거나 (프로모션/무료 이용 등) refundAmount 가 0 이면
    //   환불할 게 없는 "정상 케이스" → noRefundRequired 플래그로 구분.
    // - paymentKey 가 없는데 refundAmount > 0 이면 그것은 진짜 이상 상황.
    const paymentKey = order.payment_key as string | null;
    let refundResult: Record<string, unknown> | null = null;
    let refundError: string | null = null;
    const noRefundRequired = refundAmount === 0 || !paymentKey;

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
              cancelReason: `반송 처리 - 왕복 배송비 ${returnFee.toLocaleString()}원${
                remoteAreaFee > 0
                  ? ` + 도서산간 ${remoteAreaFee.toLocaleString()}원`
                  : ""
              } 차감`,
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
              cancellation_reason: `반송 - 왕복 배송비 ${returnFee}원${
                remoteAreaFee > 0 ? ` + 도서산간 ${remoteAreaFee}원` : ""
              } 차감`,
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
    } else if (!paymentKey && refundAmount > 0) {
      // 결제는 없는데 환불 대상 금액이 있는 비정상 상황만 에러 처리.
      // (프로모션/무료 주문은 paymentKey 자체가 없는 게 정상 → 조용히 통과)
      refundError = "결제 정보(payment_key)가 없어 환불 처리되지 않았습니다.";
    }

    const deductionDescParts = [`왕복 배송비 ${returnFee.toLocaleString()}원`];
    if (remoteAreaFee > 0) {
      deductionDescParts.push(`도서산간 ${remoteAreaFee.toLocaleString()}원`);
    }
    const deductionDesc = deductionDescParts.join(" + ");

    // 관리자/매니저들에게 알림 fan-out
    // (notifications.user_id 는 받는 사람 기준이므로 admin user_id 별로 1행씩 insert)
    try {
      const { data: managers } = await admin
        .from("users")
        .select("id")
        .in("role", ["ADMIN", "MANAGER", "SUPER_ADMIN"]);
      if (managers && managers.length > 0) {
        const itemName =
          (order as { item_name: string | null }).item_name ?? "수선 의류";
        const orderNumber =
          (order as { order_number: string | null }).order_number ?? null;
        const rows = managers.map((m: { id: string }) => ({
          user_id: m.id,
          type: "ORDER_RETURN_REQUESTED",
          title: "반송 요청 접수",
          body: `'${itemName}' (${
            orderNumber ?? orderId.slice(0, 8)
          }) 의 반송이 요청되었습니다. 송장 발급 후 반송 완료 처리를 해주세요.`,
          order_id: orderId,
          metadata: {
            orderId,
            orderNumber,
            returnFee,
            remoteAreaFee,
            totalDeduction,
            refundAmount,
            refundProcessed: !!refundResult,
            customer_user_id: (order as { user_id: string }).user_id,
          },
        }));
        await admin.from("notifications").insert(rows);
      }
    } catch (notifyErr) {
      console.warn("admin 알림 fan-out 실패 (무시):", notifyErr);
    }

    const successMessage = refundResult
      ? `반송 요청 완료. ${deductionDesc} 을(를) 차감하고 ${refundAmount.toLocaleString()}원이 환불됩니다.`
      : noRefundRequired
        ? "반송 요청이 정상 접수되었습니다. (환불 대상 결제 금액이 없습니다)"
        : `반송 요청 완료. 환불 금액(${refundAmount.toLocaleString()}원)은 별도 처리됩니다.`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      returnFee,
      remoteAreaFee,
      totalDeduction,
      refundAmount,
      refundProcessed: !!refundResult,
      refundError,
      noRefundRequired,
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
