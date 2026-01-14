import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 토스페이먼츠 시크릿 키 (환경변수 필수)
function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) {
    throw new Error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

/**
 * 토스페이먼츠 결제 조회 API
 * 
 * 사용 방법:
 * 1. paymentKey로 조회: GET /api/pay/inquiry?paymentKey=tgen_20240101...
 * 2. orderId로 조회: GET /api/pay/inquiry?orderId=order_123
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");

    if (!paymentKey && !orderId) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "paymentKey 또는 orderId가 필요합니다." },
        { status: 400 }
      );
    }

    // Basic 인증 헤더 생성
    const encodedSecretKey = Buffer.from(`${getTossSecretKey()}:`).toString("base64");

    let apiUrl: string;
    
    if (paymentKey) {
      // paymentKey로 조회
      apiUrl = `https://api.tosspayments.com/v1/payments/${paymentKey}`;
    } else {
      // orderId로 조회
      apiUrl = `https://api.tosspayments.com/v1/payments/orders/${orderId}`;
    }

    const tossResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
      },
    });

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error("토스페이먼츠 결제 조회 실패:", tossData);
      return NextResponse.json(
        {
          error: tossData.code || "INQUIRY_FAILED",
          message: tossData.message || "결제 조회에 실패했습니다.",
        },
        { status: tossResponse.status }
      );
    }

    // 필요한 정보만 추출하여 반환
    return NextResponse.json({
      success: true,
      payment: {
        // 기본 정보
        paymentKey: tossData.paymentKey,
        orderId: tossData.orderId,
        orderName: tossData.orderName,
        status: tossData.status,
        
        // 결제 금액
        totalAmount: tossData.totalAmount,
        balanceAmount: tossData.balanceAmount,
        suppliedAmount: tossData.suppliedAmount,
        vat: tossData.vat,
        
        // 결제수단
        method: tossData.method,
        
        // 시간 정보
        requestedAt: tossData.requestedAt,
        approvedAt: tossData.approvedAt,
        
        // 카드 정보 (카드 결제인 경우)
        card: tossData.card ? {
          company: tossData.card.company,
          number: tossData.card.number,
          installmentPlanMonths: tossData.card.installmentPlanMonths,
          isInterestFree: tossData.card.isInterestFree,
          approveNo: tossData.card.approveNo,
          cardType: tossData.card.cardType,
          ownerType: tossData.card.ownerType,
        } : null,
        
        // 가상계좌 정보 (가상계좌 결제인 경우)
        virtualAccount: tossData.virtualAccount ? {
          accountNumber: tossData.virtualAccount.accountNumber,
          bank: tossData.virtualAccount.bank,
          customerName: tossData.virtualAccount.customerName,
          dueDate: tossData.virtualAccount.dueDate,
          expired: tossData.virtualAccount.expired,
          settlementStatus: tossData.virtualAccount.settlementStatus,
        } : null,
        
        // 계좌이체 정보
        transfer: tossData.transfer ? {
          bank: tossData.transfer.bank,
          settlementStatus: tossData.transfer.settlementStatus,
        } : null,
        
        // 간편결제 정보
        easyPay: tossData.easyPay ? {
          provider: tossData.easyPay.provider,
          amount: tossData.easyPay.amount,
          discountAmount: tossData.easyPay.discountAmount,
        } : null,
        
        // 취소 정보
        cancels: tossData.cancels?.map((cancel: any) => ({
          cancelAmount: cancel.cancelAmount,
          cancelReason: cancel.cancelReason,
          canceledAt: cancel.canceledAt,
          transactionKey: cancel.transactionKey,
        })) || [],
        
        // 영수증
        receipt: tossData.receipt ? {
          url: tossData.receipt.url,
        } : null,
        
        // 기타
        currency: tossData.currency,
        country: tossData.country,
      },
    });
  } catch (error: any) {
    console.error("결제 조회 처리 오류:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

