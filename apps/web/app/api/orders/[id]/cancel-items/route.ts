import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  return createSupabaseClient(url, srk, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 고객이 수선 항목 일부만 취소하는 API
 *
 * Body: { itemIndices: number[], reason?: string }
 *
 * 정책:
 * - 취소할 항목들의 가격만 환불 (배송비 유지)
 * - 모든 항목이 취소되면 → 전체 취소와 동일 처리
 *   (수거 전: 우체국 접수 취소 + 배송비 포함 전액 환불)
 *   (수거 후: 배송비 차감 후 잔액 환불 + RETURN_PENDING)
 * - 이미 취소된 항목 재취소 불가
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const itemIndices: number[] = body?.itemIndices ?? [];
    const reason: string | undefined = body?.reason;

    if (!Array.isArray(itemIndices) || itemIndices.length === 0) {
      return NextResponse.json(
        { success: false, error: "취소할 항목(itemIndices)을 선택해 주세요." },
        { status: 400 }
      );
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    const admin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(
        "id, status, payment_status, payment_id, total_price, remote_area_fee, shipping_fee, user_id, repair_parts, canceled_repair_parts, item_name, order_number, tracking_no, extra_charge_data"
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
    if (!ownerIds.includes((order as any).user_id)) {
      return NextResponse.json(
        { success: false, error: "본인 주문만 취소할 수 있습니다." },
        { status: 403 }
      );
    }

    const orderStatus = (order as any).status as string;
    const isPrePickup = PRE_PICKUP_STATUSES.has(orderStatus);
    const isPostPickup = POST_PICKUP_STATUSES.has(orderStatus);

    if (!isPrePickup && !isPostPickup) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_SELF_CANCELLABLE",
          error:
            "현재 수선이 진행 중이어서 직접 취소가 불가능합니다. 고객센터로 문의해 주세요.",
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

    // 유효성 검사: 범위 & 중복 취소
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
    // shipping_fee 컬럼이 없을 수 있으므로 기본값 처리
    const shippingSettings = await getShippingSettings();
    const storedShippingFee = Number(
      (order as any).shipping_fee ?? shippingSettings.baseShippingFee ?? 0
    );

    const { cancelAmount, remainingItemsTotal, isFullCancel, parsedParts } =
      calcItemCancelAmount({
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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // ─────────────────────────────────────────────────────────
    // 수거 후 (PICKED_UP / INBOUND) 전체 취소 → 반송 워크플로우
    // 배송비는 환불하지 않음 (수거가 이미 완료됨). 수선 항목 금액만 환불.
    // ─────────────────────────────────────────────────────────
    if (isPostPickup && isFullCancel) {
      // 이번에 취소하는 항목 금액만 환불 (배송비 제외)
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
              reason: reason || "고객 요청 - 전 항목 취소 (입고 후)",
              amount: refundAmount,
            }),
          }
        );
        const d = await portoneRes.json();
        if (portoneRes.ok) {
          refundOk = true;
          await admin.from("payment_logs").insert({
            order_id: orderId,
            payment_id: paymentId,
            amount: refundAmount,
            status: "PARTIAL_CANCELED",
            provider: "PORTONE",
            response_data: d,
          }).catch(() => {});
        } else {
          refundError = d?.message || "환불 실패";
        }
      } else {
        refundOk = true;
      }

      if (refundOk) {
        const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
        await admin.from("orders").update({
          status: "RETURN_PENDING",
          payment_status: hasValidPayment && refundAmount > 0 ? "PARTIAL_CANCELED" : paymentStatus,
          extra_charge_status: "RETURN_REQUESTED",
          canceled_repair_parts: allIndices,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "고객 요청 - 전 항목 취소 (입고 후)",
          extra_charge_data: {
            ...((order as any).extra_charge_data ?? {}),
            customerAction: "USER_PARTIAL_CANCEL_ALL_AFTER_PICKUP",
            refundAmount,
            cancelRequestedAt: new Date().toISOString(),
          },
        }).eq("id", orderId);

        // 관리자 알림
        try {
          const { data: managers } = await admin.from("users").select("id").in("role", ["ADMIN", "MANAGER", "SUPER_ADMIN"]);
          if (managers?.length) {
            const itemName = (order as any).item_name ?? "수선 의류";
            const orderNumber = (order as any).order_number;
            await admin.from("notifications").insert(
              managers.map((m: any) => ({
                user_id: m.id,
                type: "ORDER_CANCEL_AFTER_PICKUP",
                title: "입고 후 전 항목 취소",
                body: `'${itemName}' (${orderNumber ?? orderId.slice(0, 8)}) 전 항목 취소 요청. 반송 송장을 발급해 주세요.`,
                order_id: orderId,
              }))
            );
          }
        } catch {}
      }

      return NextResponse.json({
        success: refundOk,
        flow: "POST_PICKUP_FULL_CANCEL",
        isFullCancel: true,
        cancelAmount: refundAmount,
        message: refundOk
          ? `전 항목 취소 요청이 접수되었습니다. ${refundAmount.toLocaleString()}원이 환불됩니다.`
          : `취소 요청 중 환불 처리에 실패했습니다.${refundError ? ` (${refundError})` : ""}`,
        refundError,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 수거 전 전체 취소 → 기존 주문 전체 취소 API 위임
    // ─────────────────────────────────────────────────────────
    if (isPrePickup && isFullCancel) {
      const cancelRes = await fetch(
        `${supabaseUrl}/functions/v1/shipments-cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
        }
      ).catch(() => null);

      const shipmentCanceled =
        cancelRes?.ok ||
        (cancelRes?.status === 404); // 수거 예약 없었으면 정상

      // 결제 전액 취소
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
            body: JSON.stringify({ reason: reason || "고객 요청 - 전 항목 취소 (수거 전)" }),
          }
        );
        const d = await portoneRes.json();
        if (portoneRes.ok) {
          paymentCanceled = true;
          await admin.from("payment_logs").insert({
            order_id: orderId,
            payment_id: paymentId,
            amount: totalPrice,
            status: "CANCELED",
            provider: "PORTONE",
            response_data: d,
          }).catch(() => {});
        } else {
          paymentCancelError = d?.message || "결제 취소 실패";
        }
      }

      if (paymentCanceled || !hasValidPayment) {
        const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
        await admin.from("orders").update({
          status: "CANCELLED",
          payment_status: paymentCanceled ? "CANCELED" : paymentStatus,
          canceled_repair_parts: allIndices,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || "고객 요청 - 전 항목 취소 (수거 전)",
        }).eq("id", orderId);
      }

      return NextResponse.json({
        success: paymentCanceled || !hasValidPayment,
        flow: "PRE_PICKUP_FULL_CANCEL",
        isFullCancel: true,
        cancelAmount: totalPrice,
        shipmentCanceled,
        paymentCanceled,
        paymentCancelError,
        message: (paymentCanceled || !hasValidPayment)
          ? "전 항목이 취소되었습니다. 결제 금액이 전액 환불됩니다."
          : `취소 중 오류가 발생했습니다.${paymentCancelError ? ` (${paymentCancelError})` : ""}`,
      });
    }

    // ─────────────────────────────────────────────────────────
    // 부분 취소 (일부 항목만) — 수거 전/후 공통
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
              `고객 요청 - 항목 부분 취소 (${itemIndices.map((i) => parsedParts[i]?.name).join(", ")})`,
            amount: cancelAmount,
          }),
        }
      );
      const d = await portoneRes.json();
      if (portoneRes.ok) {
        refundOk = true;
        await admin.from("payment_logs").insert({
          order_id: orderId,
          payment_id: paymentId,
          amount: cancelAmount,
          status: "PARTIAL_CANCELED",
          provider: "PORTONE",
          response_data: d,
        }).catch(() => {});
      } else {
        refundError = d?.message || "부분 환불 실패";
      }
    } else {
      refundOk = true; // 결제 없거나 금액 0이면 DB만 업데이트
    }

    if (refundOk) {
      const allIndices = [...new Set([...alreadyCanceled, ...itemIndices])];
      await admin.from("orders").update({
        canceled_repair_parts: allIndices,
        payment_status: hasValidPayment && cancelAmount > 0 ? "PARTIAL_CANCELED" : paymentStatus,
        canceled_at: new Date().toISOString(),
      }).eq("id", orderId);
    }

    const canceledNames = itemIndices.map((i) => parsedParts[i]?.name ?? `항목 ${i + 1}`).join(", ");

    return NextResponse.json({
      success: refundOk,
      flow: isPostPickup ? "POST_PICKUP_PARTIAL_CANCEL" : "PRE_PICKUP_PARTIAL_CANCEL",
      isFullCancel: false,
      cancelAmount,
      refundError,
      message: refundOk
        ? `'${canceledNames}' 항목이 취소되었습니다. ${cancelAmount.toLocaleString()}원이 환불됩니다.`
        : `항목 취소 중 환불 처리에 실패했습니다.${refundError ? ` (${refundError})` : ""}`,
    });
  } catch (e) {
    console.error("항목 취소 오류:", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "취소 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
