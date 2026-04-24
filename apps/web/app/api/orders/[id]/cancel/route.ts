import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getShippingSettings } from "@/lib/shipping-settings";

const PAID_STATUSES = new Set(["PAID", "COMPLETED", "DONE"]);
// BOOKED: 수거 전 → 수거 취소 + 전액 환불
// PICKED_UP / INBOUND: 의류가 이미 우리 손에 있음 → 우체국 수거 취소 불필요,
//   왕복 배송비(returnShippingFee) 차감 후 부분 환불 + 반송 워크플로우 진입
const PRE_PICKUP_STATUSES = new Set(["PENDING", "PAID", "BOOKED"]);
const POST_PICKUP_STATUSES = new Set(["PICKED_UP", "INBOUND"]);

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
 * 사용자가 자기 주문을 취소하는 API
 *
 * 1. 본인 주문인지 확인
 * 2. 우체국 수거 예약 취소 (shipments-cancel Edge)
 * 3. 결제가 완료된 주문이면 Toss 카드 자동 취소 (서비스롤로 paymentKey 조회/업데이트)
 * 4. orders.status = CANCELLED, payment_status = CANCELED
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

    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    const admin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(
        "id, status, payment_status, payment_key, total_price, user_id, extra_charge_status, extra_charge_data, item_name, order_number"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const ownerIds = [userRow?.id, user.id].filter(Boolean);
    if (!ownerIds.includes((order as { user_id: string }).user_id)) {
      return NextResponse.json(
        { success: false, error: "본인 주문만 취소할 수 있습니다." },
        { status: 403 }
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ success: true, alreadyCancelled: true });
    }

    const isPostPickup = POST_PICKUP_STATUSES.has(order.status);
    const isPrePickup = PRE_PICKUP_STATUSES.has(order.status);

    // 정책:
    //  - PENDING/PAID/BOOKED   → 수거 전: 우체국 수거 취소 + 전액 환불
    //  - PICKED_UP/INBOUND     → 수거 이후: 부분 환불(왕복 배송비 차감) + 반송 처리
    //  - 그 외 (PROCESSING/HOLD/READY_TO_SHIP/DELIVERED/RETURN_PENDING)
    //                          → 직접 취소 불가, 고객센터 문의
    if (!isPrePickup && !isPostPickup) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_SELF_CANCELLABLE",
          error:
            "현재 상태에서는 직접 취소가 불가능합니다. 고객센터로 문의해 주세요.",
        },
        { status: 409 }
      );
    }

    const paymentKey = (order as { payment_key: string | null }).payment_key;
    const paymentStatus = (order as { payment_status: string | null }).payment_status;
    const totalPrice = Number(
      (order as { total_price: number | null }).total_price ?? 0
    );
    const hasValidPayment = !!paymentKey && PAID_STATUSES.has(paymentStatus ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // ───────────────────────────────────────────────
    // ① 수거 이후 취소 (PICKED_UP / INBOUND): 부분 환불 + 반송 워크플로우
    // ───────────────────────────────────────────────
    if (isPostPickup) {
      const settings = await getShippingSettings();
      const returnFee = Math.max(
        0,
        Number(settings.returnShippingFee ?? 0) || 0
      );
      const refundAmount = Math.max(totalPrice - returnFee, 0);

      let refundResult: Record<string, unknown> | null = null;
      let refundError: string | null = null;

      if (hasValidPayment && refundAmount > 0) {
        try {
          const encodedKey = Buffer.from(`${getTossSecretKey()}:`).toString(
            "base64"
          );
          const tossRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${encodedKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cancelReason:
                  reason ||
                  `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee.toLocaleString()}원 차감)`,
                cancelAmount: refundAmount,
              }),
            }
          );
          const tossData = await tossRes.json();
          if (!tossRes.ok) {
            refundError = tossData?.message || "부분환불 실패";
          } else {
            refundResult = tossData;
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
              /* log table 미존재 시 무시 */
            }
          }
        } catch (e) {
          refundError = e instanceof Error ? e.message : String(e);
        }
      } else if (!hasValidPayment) {
        refundError = "결제 정보가 없어 환불 처리되지 않았습니다.";
      }

      // 환불에 성공했거나 환불할 금액이 없을 때만 상태 전이.
      // (환불 실패 시 재시도 가능하도록 상태는 유지)
      const refundOk = !!refundResult || refundAmount === 0;
      if (refundOk) {
        const existingExtraData =
          (order as { extra_charge_data: Record<string, unknown> | null })
            .extra_charge_data ?? {};
        const updatedExtraData = {
          ...existingExtraData,
          customerAction: "USER_CANCEL_AFTER_PICKUP",
          returnFee,
          cancelRequestedAt: new Date().toISOString(),
          cancelReason: reason || "고객 요청 - 입고 후 취소",
        };

        await admin
          .from("orders")
          .update({
            status: "RETURN_PENDING",
            payment_status: refundResult ? "PARTIAL_CANCELED" : paymentStatus,
            extra_charge_status: "RETURN_REQUESTED",
            extra_charge_data: updatedExtraData,
            canceled_at: new Date().toISOString(),
            cancellation_reason:
              reason ||
              `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee}원 차감)`,
          })
          .eq("id", orderId);

        // 관리자 알림 (notifications 테이블이 있을 때만)
        try {
          await admin.from("notifications").insert({
            user_id: (order as { user_id: string }).user_id,
            type: "ORDER_CANCEL_AFTER_PICKUP",
            title: "입고 후 취소 요청",
            body: `'${
              (order as { item_name: string | null }).item_name ?? "주문"
            }' 상품의 취소가 요청되었습니다. 반송 송장을 발급해 주세요.`,
            metadata: {
              orderId,
              orderNumber:
                (order as { order_number: string | null }).order_number ?? null,
              returnFee,
              refundAmount,
            },
          });
        } catch {
          /* notifications 미설정 시 무시 */
        }
      }

      return NextResponse.json({
        success: true,
        flow: "POST_PICKUP_RETURN",
        message: refundResult
          ? `취소 요청이 접수되었습니다. 왕복 배송비 ${returnFee.toLocaleString()}원을 차감한 ${refundAmount.toLocaleString()}원이 환불됩니다.`
          : refundAmount === 0
            ? "취소 요청이 접수되었습니다."
            : `취소 요청이 접수되었으나 환불 처리에 실패했습니다.${
                refundError ? ` (${refundError})` : ""
              } 고객센터로 문의해 주세요.`,
        returnFee,
        refundAmount,
        refundProcessed: !!refundResult,
        refundError,
        hasValidPayment,
        // 호환을 위한 필드 (웹 UI 가 기존 키를 참조)
        shipmentCanceled: false,
        paymentCanceled: !!refundResult,
        paymentCancelError: refundError,
      });
    }

    // ───────────────────────────────────────────────
    // ② 수거 전 취소 (PENDING / PAID / BOOKED): 우체국 수거 취소 + 전액 환불
    // ───────────────────────────────────────────────

    // 1) 우체국 수거 취소
    const shipmentRes = await fetch(`${supabaseUrl}/functions/v1/shipments-cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
    });
    const shipmentResult = await shipmentRes.json().catch(() => ({}));

    if (!shipmentRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: shipmentResult?.error || "수거 취소에 실패했습니다.",
          step: "shipment",
        },
        { status: 500 }
      );
    }

    // 2) 카드 결제 취소 (있을 때만)
    let paymentCancelResult: Record<string, unknown> | null = null;
    let paymentCancelError: string | null = null;

    if (hasValidPayment) {
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
              cancelReason: reason || "고객 요청 - 수거 예약 취소",
            }),
          }
        );
        const tossData = await tossRes.json();

        if (!tossRes.ok) {
          paymentCancelError = tossData?.message || "카드 취소 실패";
        } else {
          paymentCancelResult = tossData;
          await admin
            .from("orders")
            .update({
              status: "CANCELLED",
              payment_status: "CANCELED",
              canceled_at: new Date().toISOString(),
              cancellation_reason: reason || "고객 요청 - 수거 예약 취소",
            })
            .eq("id", orderId);

          try {
            await admin.from("payment_logs").insert({
              order_id: orderId,
              payment_key: paymentKey,
              amount: totalPrice ?? tossData.totalAmount,
              status: "CANCELED",
              provider: "TOSS",
              response_data: tossData,
            });
          } catch {
            /* log table 미존재 시 무시 */
          }
        }
      } catch (e) {
        paymentCancelError = e instanceof Error ? e.message : String(e);
      }
    } else {
      // 결제가 없거나 paymentKey가 없을 때는 주문만 취소
      await admin
        .from("orders")
        .update({
          status: "CANCELLED",
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "고객 요청 - 수거 예약 취소",
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      success: true,
      flow: "PRE_PICKUP_CANCEL",
      message: shipmentResult?.message || "수거 예약이 취소되었습니다.",
      shipmentCanceled: true,
      paymentCanceled: !!paymentCancelResult,
      paymentCancelError,
      hasValidPayment,
      epost_result: shipmentResult?.epost_result,
    });
  } catch (e) {
    console.error("주문 취소 오류:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
