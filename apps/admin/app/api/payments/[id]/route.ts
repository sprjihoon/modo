import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 토스페이먼츠 시크릿 키
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * 결제 상세 조회 API (DB + 토스페이먼츠)
 * 
 * GET /api/payments/[orderId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const orderId = params.id;
    
    // 1. DB에서 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        customer_name,
        customer_phone,
        customer_email,
        total_price,
        payment_status,
        payment_method,
        payment_key,
        paid_at,
        canceled_at,
        status,
        item_name,
        clothing_type,
        repair_type
      `)
      .eq("id", orderId)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "주문을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 2. 토스페이먼츠 결제 정보 조회 (payment_key가 있는 경우)
    let tossPayment = null;
    if (order.payment_key) {
      try {
        const encodedSecretKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
        const tossResponse = await fetch(
          `https://api.tosspayments.com/v1/payments/${order.payment_key}`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${encodedSecretKey}`,
            },
          }
        );
        
        if (tossResponse.ok) {
          const tossData = await tossResponse.json();
          tossPayment = {
            paymentKey: tossData.paymentKey,
            orderId: tossData.orderId,
            orderName: tossData.orderName,
            status: tossData.status,
            totalAmount: tossData.totalAmount,
            balanceAmount: tossData.balanceAmount,
            suppliedAmount: tossData.suppliedAmount,
            vat: tossData.vat,
            method: tossData.method,
            requestedAt: tossData.requestedAt,
            approvedAt: tossData.approvedAt,
            card: tossData.card ? {
              company: tossData.card.company,
              number: tossData.card.number,
              installmentPlanMonths: tossData.card.installmentPlanMonths,
              isInterestFree: tossData.card.isInterestFree,
              approveNo: tossData.card.approveNo,
              cardType: tossData.card.cardType,
              ownerType: tossData.card.ownerType,
            } : null,
            virtualAccount: tossData.virtualAccount ? {
              accountNumber: tossData.virtualAccount.accountNumber,
              bank: tossData.virtualAccount.bank,
              customerName: tossData.virtualAccount.customerName,
              dueDate: tossData.virtualAccount.dueDate,
              expired: tossData.virtualAccount.expired,
            } : null,
            transfer: tossData.transfer ? {
              bank: tossData.transfer.bank,
            } : null,
            easyPay: tossData.easyPay ? {
              provider: tossData.easyPay.provider,
              amount: tossData.easyPay.amount,
              discountAmount: tossData.easyPay.discountAmount,
            } : null,
            cancels: tossData.cancels?.map((cancel: any) => ({
              cancelAmount: cancel.cancelAmount,
              cancelReason: cancel.cancelReason,
              canceledAt: cancel.canceledAt,
              transactionKey: cancel.transactionKey,
              refundableAmount: cancel.refundableAmount,
            })) || [],
            receipt: tossData.receipt,
            currency: tossData.currency,
          };
        }
      } catch (tossError) {
        console.error("토스페이먼츠 조회 실패:", tossError);
        // 토스 조회 실패해도 DB 정보는 반환
      }
    }
    
    // 3. 결제 로그 조회
    const { data: paymentLogs } = await supabase
      .from("payment_logs")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    
    // 4. 응답 데이터 구성
    const payment = {
      id: order.id,
      orderId: order.id,
      customerName: order.customer_name || "고객명 없음",
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      amount: order.total_price || 0,
      method: order.payment_method || "CARD",
      status: order.payment_status || "PENDING",
      paymentKey: order.payment_key,
      orderStatus: order.status,
      itemName: order.item_name || `${order.clothing_type || ""} - ${order.repair_type || ""}`,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      canceledAt: order.canceled_at,
      // 토스 정보 병합
      tossPayment,
      // 결제 로그
      logs: paymentLogs || [],
    };
    
    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    console.error("결제 상세 조회 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

