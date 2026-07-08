import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  buildPrePickupCancelUpdate,
  buildReturnPendingOrderUpdate,
  isPostInboundOrderStatus,
  wasInboundOrder,
} from "@/lib/order-return-flow";

export const dynamic = "force-dynamic";

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

interface CancelRequest {
  paymentId: string;
  cancelReason: string;
  cancelAmount?: number;
  currentCancellableAmount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CancelRequest = await request.json();
    const { paymentId, cancelReason, cancelAmount, currentCancellableAmount } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "paymentId가 필요합니다." },
        { status: 400 }
      );
    }
    if (!cancelReason) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "취소 사유(cancelReason)가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const cancelBody: Record<string, unknown> = { reason: cancelReason };
    if (cancelAmount && cancelAmount > 0) {
      cancelBody.amount = cancelAmount;
    }
    if (currentCancellableAmount && currentCancellableAmount > 0) {
      cancelBody.currentCancellableAmount = currentCancellableAmount;
    }

    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${getPortoneApiSecret()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelBody),
      }
    );

    const portoneData = await portoneRes.json();

    if (!portoneRes.ok) {
      console.error("포트원 결제 취소 실패:", portoneData);
      return NextResponse.json(
        { error: portoneData.code || "CANCEL_FAILED", message: portoneData.message || "결제 취소에 실패했습니다." },
        { status: portoneRes.status }
      );
    }

    console.log("✅ 결제 취소 성공:", paymentId);

    const isTotalCancel = !cancelAmount;
    const newPaymentStatus = isTotalCancel ? "CANCELED" : "PARTIAL_CANCELED";

    const { data: extraChargeReq } = await supabase
      .from("extra_charge_requests")
      .update({ status: newPaymentStatus, canceled_at: new Date().toISOString() })
      .eq("id", paymentId)
      .select()
      .single();

    let affectedOrder: {
      id: string;
      user_id: string;
      order_number: string;
      total_price: number;
      status: string;
      extra_charge_data: Record<string, unknown> | null;
    } | null = null;
    let shipmentCancelWarning: string | null = null;

    if (!extraChargeReq) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, user_id, order_number, total_price, status, extra_charge_data")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (existingOrder) {
        // 전체 취소이고 수거 전(PAID/BOOKED) 상태이거나 tracking_no가 있는 경우 우체국 접수도 함께 취소
        const PRE_PICKUP_STATUSES = new Set(["PENDING", "PAID", "BOOKED", "PENDING_PAYMENT"]);
        const needsShipmentCancel =
          isTotalCancel &&
          (PRE_PICKUP_STATUSES.has(existingOrder.status) || existingOrder.status === "BOOKED");

        if (needsShipmentCancel) {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const shipmentCancelRes = await fetch(
              `${supabaseUrl}/functions/v1/shipments-cancel`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({ order_id: existingOrder.id, delete_after_cancel: false }),
              }
            );
            if (!shipmentCancelRes.ok) {
              const result = await shipmentCancelRes.json();
              // SHIPMENT_NOT_FOUND 는 수거 접수 전이므로 정상
              if (result?.code !== "SHIPMENT_NOT_FOUND" && shipmentCancelRes.status !== 404) {
                console.error("⚠️ 우체국 수거 취소 실패 (결제 취소는 완료됨):", result);
                shipmentCancelWarning = result.error || "우체국 수거 취소 실패";
              }
            } else {
              console.log("✅ 우체국 수거 취소 완료 (결제 취소와 함께)");
            }
          } catch (e) {
            console.error("우체국 수거 취소 오류:", e);
            shipmentCancelWarning = (e as Error).message || "우체국 수거 취소 오류";
          }
        }

        const { data: shipment } = await supabase
          .from("shipments")
          .select("status, inbound_at, pickup_tracking_no")
          .eq("order_id", existingOrder.id)
          .maybeSingle();

        const orderContext = { ...existingOrder, shipment };
        const orderUpdate: Record<string, unknown> = {
          payment_status: newPaymentStatus,
        };

        if (isTotalCancel) {
          if (isPostInboundOrderStatus(existingOrder.status) || wasInboundOrder(orderContext)) {
            Object.assign(
              orderUpdate,
              buildReturnPendingOrderUpdate(existingOrder.extra_charge_data, {
                reason: cancelReason || "관리자 결제 취소 (입고 후 — 반송 필요)",
                source: "ADMIN_PAYMENT_CANCEL",
              })
            );
          } else {
            Object.assign(
              orderUpdate,
              buildPrePickupCancelUpdate(cancelReason || "관리자 결제 취소")
            );
          }
        } else {
          orderUpdate.canceled_at = new Date().toISOString();
        }

        const { data: updatedOrder } = await supabase
          .from("orders")
          .update(orderUpdate)
          .eq("id", existingOrder.id)
          .select("id, user_id, order_number, total_price, status, extra_charge_data")
          .maybeSingle();
        affectedOrder = updatedOrder;
      }
    }

    // 고객에게 알림 발송 (DB insert + FCM 푸시)
    try {
      if (affectedOrder?.user_id) {
        const canceledAmount = cancelAmount ?? affectedOrder.total_price;
        const notifTitle = isTotalCancel ? "주문 취소 완료" : "부분 환불 완료";
        const notifBody = isTotalCancel
          ? `주문(${affectedOrder.order_number || affectedOrder.id.slice(-8)})이 취소되었습니다. 결제하신 ${(canceledAmount ?? 0).toLocaleString()}원이 환불 처리됩니다.`
          : `주문(${affectedOrder.order_number || affectedOrder.id.slice(-8)})에서 ${(canceledAmount ?? 0).toLocaleString()}원이 부분 환불 처리됩니다.`;

        // 1. notifications 테이블에 저장
        await supabase.from("notifications").insert({
          user_id: affectedOrder.user_id,
          type: isTotalCancel ? "order_cancelled" : "order_partial_refund",
          title: notifTitle,
          body: notifBody,
          order_id: affectedOrder.id,
        });

        // 2. 고객 FCM 토큰 조회 후 푸시 전송
        const { data: userRow } = await supabase
          .from("users")
          .select("fcm_token")
          .eq("id", affectedOrder.user_id)
          .maybeSingle();

        if (userRow?.fcm_token) {
          const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              userId: affectedOrder.user_id,
              orderId: affectedOrder.id,
              title: notifTitle,
              body: notifBody,
              fcmToken: userRow.fcm_token,
            }),
          });
        }
      }
    } catch (e) {
      console.log("취소 알림 발송 실패:", e);
    }

    try {
      await supabase.from("payment_logs").insert({
        payment_id: paymentId,
        amount: cancelAmount,
        status: "CANCELED",
        provider: "PORTONE",
        response_data: portoneData,
      });
    } catch (e) {
      console.log("취소 로그 저장 실패:", e);
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status: portoneData.payment?.status,
      canceledAt: new Date().toISOString(),
      ...(shipmentCancelWarning ? { shipmentCancelWarning } : {}),
    });
  } catch (error: unknown) {
    console.error("결제 취소 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: (error as Error).message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
