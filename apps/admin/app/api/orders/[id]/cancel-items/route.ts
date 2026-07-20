import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { getShippingSettings } from "@/lib/shipping-settings";
import { calcItemCancelAmount } from "@/lib/repair-parts";

const PAID_STATUSES = new Set(["PAID", "COMPLETED", "DONE"]);
const PRE_PICKUP_STATUSES = new Set(["PENDING", "PAID", "BOOKED", "PENDING_PAYMENT"]);
const POST_PICKUP_STATUSES = new Set(["PICKED_UP", "INBOUND"]);

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

/**
 * 관리자가 수선 항목 일부를 취소하는 API
 *
 * Body: { itemIndices: number[], reason?: string }
 *
 * 정책 (관리자):
 * - 취소 항목 금액만 부분 환불 (배송비 유지)
 * - 모든 항목 취소 시 전체 취소와 동일:
 *   수거 전 → 우체국 접수 취소 + 전액 환불
 *   수거 후 → 배송비 차감 환불 + RETURN_PENDING
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id: orderId } = await params;

    const body = await request.json().catch(() => ({}));
    const itemIndices: number[] = body?.itemIndices ?? [];
    const reason: string | undefined = body?.reason;

    if (!Array.isArray(itemIndices) || itemIndices.length === 0) {
      return NextResponse.json(
        { success: false, error: "취소할 항목(itemIndices)을 선택해 주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, status, payment_status, payment_id, total_price, remote_area_fee, user_id, repair_parts, canceled_repair_parts, item_name, order_number, tracking_no, extra_charge_data"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const orderStatus = (order as any).status as string;
    const isPrePickup = PRE_PICKUP_STATUSES.has(orderStatus);
    const isPostPickup = POST_PICKUP_STATUSES.has(orderStatus);

    if (!isPrePickup && !isPostPickup) {
      return NextResponse.json(
        {
          success: false,
          code: "CANNOT_CANCEL_ITEMS",
          error: `현재 상태(${orderStatus})에서는 항목 취소가 불가능합니다.`,
        },
        { status: 409 }
      );
    }

    const repairParts: string[] = (order as any).repair_parts ?? [];
    const alreadyCanceled: number[] = (order as any).canceled_repair_parts ?? [];

    if (repairParts.length === 0) {
      return NextResponse.json(
        { success: false, error: "수선 항목 정보가 없습니다." },
        { status: 400 }
      );
    }

    for (const idx of itemIndices) {
      if (idx < 0 || idx >= repairParts.length) {
        return NextResponse.json(
          { success: false, error: `존재하지 않는 항목 번호: ${idx}` },
          { status: 400 }
        );
      }
      if (alreadyCanceled.includes(idx)) {
        return NextResponse.json(
          { success: false, error: `이미 취소된 항목입니다: ${idx}` },
          { status: 400 }
        );
      }
    }

    const totalPrice = Number((order as any).total_price ?? 0);
    const remoteAreaFee = Number((order as any).remote_area_fee ?? 0);
    const shippingSettings = await getShippingSettings();
    const storedShippingFee = Number(
      (order as any).shipping_fee ?? shippingSettings.baseShippingFee ?? 0
    );

    const { cancelAmount, isFullCancel, parsedParts } = calcItemCancelAmount({
      repairParts,
      alreadyCanceled,
      newCancelIndices: itemIndices,
      totalPrice,
      shippingFee: storedShippingFee,
      remoteAreaFee,
    });

    const paymentId = (order as any).payment_id as string | null;
    const paymentStatus = (order as any).payment_status as string | null;
    const hasValidPayment = !!paymentId && PAID_STATUSES.has(paymentStatus ?? "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // ─────────────────────────────────────────────────────────
    // 전체 취소 + 수거 전 → 우체국 접수 취소 + 전액 환불
    // ─────────────────────────────────────────────────────────
    if (isFullCancel && isPrePickup) {
      let shipmentCanceled = false;
      if ((order as any).tracking_no || orderStatus === "BOOKED") {
        const res = await fetch(`${supabaseUrl}/functions/v1/shipments-cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
        }).catch(() => null);
        shipmentCanceled = !!res?.ok;
      }

      let paymentCanceled = false;
      let paymentCancelError: string | null = null;
      if (hasValidPayment) {
        const portoneRes = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId!)}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `PortOne ${getPortoneApiSecret()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason: reason || "관리자 - 전 항목 취소 (수거 전)" }),
          }
        );
        const d = await portoneRes.json();
        if (portoneRes.ok) {
          paymentCanceled = true;
          try {
            await supabase.from("payment_logs" as any).insert({
              order_id: orderId,
              payment_id: paymentId,
              amount: totalPrice,
              status: "CANCELED",
              provider: "PORTONE",
              response_data: d,
            });
          } catch {
            // 로그 실패는 무시
          }
        } else {
          paymentCancelError = d?.message || "결제 취소 실패";
        }
      }

      if (paymentCanceled || !hasValidPayment) {
        const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
        await supabase.from("orders").update({
          status: "CANCELLED",
          payment_status: paymentCanceled ? "CANCELED" : paymentStatus,
          canceled_repair_parts: allIndices,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "관리자 - 전 항목 취소 (수거 전)",
        } as any).eq("id", orderId);
      }

      return NextResponse.json({
        success: paymentCanceled || !hasValidPayment,
        flow: "ADMIN_PRE_PICKUP_FULL_CANCEL",
        isFullCancel: true,
        cancelAmount: totalPrice,
        shipmentCanceled,
        paymentCanceled,
        paymentCancelError,
        message: (paymentCanceled || !hasValidPayment)
          ? "전 항목 취소 처리 완료. 결제 금액이 전액 환불됩니다."
          : `취소 처리 중 오류 발생.${paymentCancelError ? ` (${paymentCancelError})` : ""}`,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 전체 취소 + 수거 후 → 수선 항목 금액만 환불, 배송비 환불 없음, RETURN_PENDING
    // ─────────────────────────────────────────────────────────
    if (isFullCancel && isPostPickup) {
      // 배송비는 환불하지 않음. 이번에 취소하는 항목 금액만 환불.
      const refundAmount = cancelAmount;

      let refundOk = false;
      let refundError: string | null = null;
      if (hasValidPayment && refundAmount > 0) {
        const portoneRes = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId!)}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `PortOne ${getPortoneApiSecret()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reason: reason || "관리자 - 전 항목 취소 (입고 후)",
              amount: refundAmount,
            }),
          }
        );
        const d = await portoneRes.json();
        if (portoneRes.ok) {
          refundOk = true;
          try {
            await supabase.from("payment_logs" as any).insert({
              order_id: orderId,
              payment_id: paymentId,
              amount: refundAmount,
              status: "PARTIAL_CANCELED",
              provider: "PORTONE",
              response_data: d,
            });
          } catch {
            // 로그 실패는 무시
          }
        } else {
          refundError = d?.message || "환불 실패";
        }
      } else {
        refundOk = true;
      }

      if (refundOk) {
        const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
        await supabase.from("orders").update({
          status: "RETURN_PENDING",
          payment_status: hasValidPayment && refundAmount > 0 ? "PARTIAL_CANCELED" : paymentStatus,
          extra_charge_status: "RETURN_REQUESTED",
          canceled_repair_parts: allIndices,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "관리자 - 전 항목 취소 (입고 후)",
          extra_charge_data: {
            ...((order as any).extra_charge_data ?? {}),
            customerAction: "ADMIN_PARTIAL_CANCEL_ALL_AFTER_PICKUP",
            refundAmount,
          },
        } as any).eq("id", orderId);
      }

      return NextResponse.json({
        success: refundOk,
        flow: "ADMIN_POST_PICKUP_FULL_CANCEL",
        isFullCancel: true,
        cancelAmount: refundAmount,
        refundError,
        message: refundOk
          ? `전 항목 취소 완료. 수선 항목 ${refundAmount.toLocaleString()}원 환불, 배송비 제외. 반송 처리 필요.`
          : `환불 처리에 실패했습니다.${refundError ? ` (${refundError})` : ""}`,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 부분 취소 (공통)
    // ─────────────────────────────────────────────────────────
    let refundOk = false;
    let refundError: string | null = null;

    if (hasValidPayment && cancelAmount > 0) {
      const portoneRes = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId!)}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `PortOne ${getPortoneApiSecret()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason:
              reason ||
              `관리자 - 항목 부분 취소 (${itemIndices.map((i) => parsedParts[i]?.name).join(", ")})`,
            amount: cancelAmount,
          }),
        }
      );
      const d = await portoneRes.json();
      if (portoneRes.ok) {
        refundOk = true;
        try {
          await supabase.from("payment_logs" as any).insert({
            order_id: orderId,
            payment_id: paymentId,
            amount: cancelAmount,
            status: "PARTIAL_CANCELED",
            provider: "PORTONE",
            response_data: d,
          });
        } catch {
          // 로그 실패는 무시
        }
      } else {
        refundError = d?.message || "부분 환불 실패";
      }
    } else {
      refundOk = true;
    }

    if (refundOk) {
      const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
      await supabase.from("orders").update({
        canceled_repair_parts: allIndices,
        payment_status: hasValidPayment && cancelAmount > 0 ? "PARTIAL_CANCELED" : paymentStatus,
        canceled_at: new Date().toISOString(),
      } as any).eq("id", orderId);
    }

    const canceledNames = itemIndices
      .map((i) => parsedParts[i]?.name ?? `항목 ${i + 1}`)
      .join(", ");

    return NextResponse.json({
      success: refundOk,
      flow: isPostPickup ? "ADMIN_POST_PICKUP_PARTIAL" : "ADMIN_PRE_PICKUP_PARTIAL",
      isFullCancel: false,
      cancelAmount,
      refundError,
      message: refundOk
        ? `'${canceledNames}' 취소 완료. ${cancelAmount.toLocaleString()}원 환불.`
        : `환불 처리에 실패했습니다.${refundError ? ` (${refundError})` : ""}`,
    });
  } catch (e) {
    console.error("관리자 항목 취소 오류:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
