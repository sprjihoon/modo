import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
}

export async function POST(request: NextRequest) {
  try {
    const body: CancelRequest = await request.json();
    const { paymentId, cancelReason, cancelAmount } = body;

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
    if (cancelAmount) cancelBody.amount = cancelAmount;

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

    let affectedOrder: { id: string; user_id: string; order_number: string; total_price: number } | null = null;

    if (!extraChargeReq) {
      const orderUpdate: Record<string, unknown> = {
        payment_status: newPaymentStatus,
        canceled_at: new Date().toISOString(),
      };
      if (isTotalCancel) {
        orderUpdate.status = "CANCELLED";
      }
      const { data: updatedOrder } = await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("payment_id", paymentId)
        .select("id, user_id, order_number, total_price")
        .maybeSingle();
      affectedOrder = updatedOrder;
    }

    // 고객에게 알림 발송
    try {
      if (affectedOrder?.user_id) {
        const canceledAmount = cancelAmount ?? affectedOrder.total_price;
        const notifTitle = isTotalCancel ? "주문 취소 완료" : "부분 환불 완료";
        const notifBody = isTotalCancel
          ? `주문(${affectedOrder.order_number})이 취소되었습니다. 결제하신 ${(canceledAmount ?? 0).toLocaleString()}원이 환불 처리됩니다.`
          : `주문(${affectedOrder.order_number})에서 ${(canceledAmount ?? 0).toLocaleString()}원이 부분 환불 처리됩니다.`;

        await supabase.from("notifications").insert({
          user_id: affectedOrder.user_id,
          type: isTotalCancel ? "order_cancelled" : "order_partial_refund",
          title: notifTitle,
          body: notifBody,
          order_id: affectedOrder.id,
        });
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
    });
  } catch (error: unknown) {
    console.error("결제 취소 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: (error as Error).message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
