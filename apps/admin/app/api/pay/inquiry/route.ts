import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  return key;
}

/**
 * 포트원 V2 결제 조회 API
 *
 * GET /api/pay/inquiry?paymentId=payment_xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "paymentId가 필요합니다." },
        { status: 400 }
      );
    }

    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${getPortoneApiSecret()}` } }
    );

    const portoneData = await portoneRes.json();

    if (!portoneRes.ok) {
      console.error("포트원 결제 조회 실패:", portoneData);
      return NextResponse.json(
        { error: portoneData.code || "INQUIRY_FAILED", message: portoneData.message || "결제 조회에 실패했습니다." },
        { status: portoneRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        paymentId: portoneData.id,
        status: portoneData.status,
        orderName: portoneData.orderName,
        totalAmount: portoneData.amount?.total,
        currency: portoneData.currency,
        method: portoneData.method?.type,
        paidAt: portoneData.paidAt,
        requestedAt: portoneData.requestedAt,
        customer: portoneData.customer,
        cancellations: portoneData.cancellations ?? [],
      },
    });
  } catch (error: unknown) {
    console.error("결제 조회 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: (error as Error).message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
