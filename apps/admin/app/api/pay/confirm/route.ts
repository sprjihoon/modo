import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

interface PaymentConfirmRequest {
  paymentId: string;
  orderId: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentConfirmRequest = await request.json();
    const { paymentId, orderId, amount } = body;

    if (!paymentId || !orderId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: orderData } = await supabase
      .from("extra_charge_requests")
      .select("*")
      .eq("id", orderId)
      .single();

    let isExtraCharge = !!orderData;
    let originalAmount = orderData?.amount;

    if (!orderData) {
      const { data: normalOrder, error: normalOrderError } = await supabase
        .from("orders")
        .select("id, total_price")
        .eq("id", orderId)
        .single();

      if (normalOrderError || !normalOrder) {
        return NextResponse.json(
          { error: "ORDER_NOT_FOUND", message: "주문 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      originalAmount = normalOrder.total_price;
      isExtraCharge = false;
    }

    // amount가 0이면 DB 사전 검증 생략 (PortOne 검증이 source of truth)
    if (amount && originalAmount && originalAmount !== amount) {
      return NextResponse.json(
        { error: "AMOUNT_MISMATCH", message: "결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 포트원 V2: 결제 단건 조회로 검증
    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${getPortoneApiSecret()}` } }
    );
    const portoneData = await portoneRes.json();

    if (!portoneRes.ok) {
      console.error("포트원 결제 조회 실패:", portoneData);
      return NextResponse.json(
        { error: portoneData.code || "PAYMENT_FAILED", message: portoneData.message || "결제 검증에 실패했습니다." },
        { status: portoneRes.status }
      );
    }

    if (portoneData.status !== "PAID") {
      return NextResponse.json(
        { error: "PAYMENT_NOT_PAID", message: `결제가 완료되지 않았습니다. (status: ${portoneData.status})` },
        { status: 400 }
      );
    }

    if (portoneData.amount?.total !== amount) {
      return NextResponse.json(
        { error: "AMOUNT_MISMATCH", message: "포트원 결제 금액이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const paidAt = portoneData.paidAt ?? portoneData.approvedAt ?? new Date().toISOString();
    const payMethod = portoneData.method?.type ?? "CARD";

    if (isExtraCharge) {
      await supabase
        .from("extra_charge_requests")
        .update({
          status: "PAID",
          payment_id: paymentId,
          customer_response_at: paidAt,
        })
        .eq("id", orderId);

      if (orderData?.worker_id) {
        await supabase.from("notifications").insert({
          user_id: orderData.worker_id,
          type: "EXTRA_CHARGE_RESPONSE",
          title: "추가 비용 결제 완료",
          body: `고객이 추가 비용 ${amount.toLocaleString()}원을 결제했습니다.`,
          metadata: { requestId: orderId, orderId: orderData.order_id, paymentId },
        });
      }
    } else {
      await supabase
        .from("orders")
        .update({
          status: "PAID",
          payment_status: "PAID",
          payment_id: paymentId,
          paid_at: paidAt,
        })
        .eq("id", orderId);
    }

    try {
      await supabase.from("payment_logs").insert({
        order_id: isExtraCharge ? orderData?.order_id : orderId,
        payment_id: paymentId,
        amount: portoneData.amount?.total,
        method: payMethod,
        status: "SUCCESS",
        provider: "PORTONE",
        response_data: portoneData,
        approved_at: paidAt,
      });
    } catch (e) {
      console.log("결제 로그 저장 실패:", e);
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentId,
      method: payMethod,
      totalAmount: portoneData.amount?.total,
      approvedAt: paidAt,
    });
  } catch (error: unknown) {
    console.error("결제 승인 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: (error as Error).message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
