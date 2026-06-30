import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 결제 상세 조회 API (DB + 포트원 V2)
 *
 * GET /api/payments/[orderId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;
    const supabase = await createClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id, created_at, customer_name, customer_phone, customer_email,
        total_price, payment_status, payment_method, payment_id,
        paid_at, canceled_at, status, item_name, clothing_type, repair_type
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 포트원 V2 결제 상세 조회
    let portonePayment = null;
    const paymentId = (order as { payment_id?: string | null }).payment_id;
    if (paymentId) {
      try {
        const portoneRes = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
          { headers: { Authorization: `PortOne ${getPortoneApiSecret()}` } }
        );
        if (portoneRes.ok) {
          const d = await portoneRes.json();
          portonePayment = {
            paymentId: d.id,
            status: d.status,
            orderName: d.orderName,
            totalAmount: d.amount?.total,
            currency: d.currency,
            method: d.method?.type,
            paidAt: d.paidAt,
            requestedAt: d.requestedAt,
            customer: d.customer,
            cancellations: d.cancellations ?? [],
          };
        }
      } catch (e) {
        console.error("포트원 결제 조회 실패:", e);
      }
    }

    const { data: paymentLogs } = await supabase
      .from("payment_logs")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    const payment = {
      id: order.id,
      orderId: order.id,
      customerName: (order as any).customer_name || "고객명 없음",
      customerPhone: (order as any).customer_phone,
      customerEmail: (order as any).customer_email,
      amount: (order as any).total_price || 0,
      method: (order as any).payment_method || "CARD",
      status: (order as any).payment_status || "PENDING",
      paymentId,
      orderStatus: (order as any).status,
      itemName:
        (order as any).item_name ||
        `${(order as any).clothing_type || ""} - ${(order as any).repair_type || ""}`,
      createdAt: (order as any).created_at,
      paidAt: (order as any).paid_at,
      canceledAt: (order as any).canceled_at,
      portonePayment,
      logs: paymentLogs || [],
    };

    return NextResponse.json({ success: true, payment });
  } catch (error: unknown) {
    console.error("결제 상세 조회 오류:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
