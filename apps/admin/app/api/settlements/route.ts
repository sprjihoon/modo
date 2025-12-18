import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 정산관리 API - 부가세 신고 및 결제 방식별 정산 데이터 제공
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMethod = searchParams.get('paymentMethod'); // 결제 방식 필터

    // 주문 및 결제 정보 조회
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        total_price,
        original_total_price,
        promotion_discount_amount,
        promotion_code_id,
        status,
        payment_status,
        created_at,
        payments (
          id,
          amount,
          payment_method,
          payment_method_detail,
          status,
          paid_at,
          card_name,
          bank_name
        )
      `)
      .eq('payment_status', 'PAID'); // 결제 완료된 주문만

    // 날짜 필터
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('정산 데이터 조회 실패:', error);
      return NextResponse.json(
        { error: '정산 데이터 조회 실패', details: error.message },
        { status: 500 }
      );
    }

    // 결제 방식별 필터링 (클라이언트 사이드에서도 가능하지만, 서버에서 필터링하면 더 효율적)
    let filteredOrders = orders || [];
    if (paymentMethod && paymentMethod !== 'ALL') {
      filteredOrders = filteredOrders.filter(order => 
        order.payments && order.payments.length > 0 && 
        order.payments.some((p: any) => p.payment_method === paymentMethod)
      );
    }

    // 결제 방식별 집계
    const paymentMethodStats: Record<string, { count: number; amount: number; orders: any[] }> = {
      CARD: { count: 0, amount: 0, orders: [] },
      BANK_TRANSFER: { count: 0, amount: 0, orders: [] },
      VIRTUAL_ACCOUNT: { count: 0, amount: 0, orders: [] },
      MOBILE: { count: 0, amount: 0, orders: [] },
      KAKAO_PAY: { count: 0, amount: 0, orders: [] },
      NAVER_PAY: { count: 0, amount: 0, orders: [] },
      TOSS_PAY: { count: 0, amount: 0, orders: [] },
    };

    // 프로모션 사용 통계
    let promotionUsedCount = 0;
    let totalPromotionDiscount = 0;

    // 각 주문별 집계
    filteredOrders.forEach((order: any) => {
      // 프로모션 할인 집계
      if (order.promotion_code_id) {
        promotionUsedCount++;
        totalPromotionDiscount += order.promotion_discount_amount || 0;
      }

      // 결제 방식별 집계
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach((payment: any) => {
          if (payment.status === 'PAID' && paymentMethodStats[payment.payment_method]) {
            paymentMethodStats[payment.payment_method].count++;
            paymentMethodStats[payment.payment_method].amount += payment.amount;
            paymentMethodStats[payment.payment_method].orders.push({
              order_id: order.id,
              order_number: order.order_number,
              amount: payment.amount,
              paid_at: payment.paid_at,
              card_name: payment.card_name,
              bank_name: payment.bank_name,
            });
          }
        });
      }
    });

    // 총 매출 계산 (실제 결제된 금액)
    const totalRevenue = Object.values(paymentMethodStats).reduce(
      (sum, stat) => sum + stat.amount,
      0
    );

    // 부가세 및 공급가액 계산
    // 총 매출에서 부가세 10% 역계산
    const supplyAmount = Math.round(totalRevenue / 1.1); // 공급가액
    const vatAmount = totalRevenue - supplyAmount; // 부가세

    // 통계 데이터
    const stats = {
      // 기본 통계
      totalOrders: filteredOrders.length,
      totalRevenue, // 총 매출 (실제 결제 금액)
      
      // 프로모션 관련
      promotionUsedCount,
      totalPromotionDiscount,
      
      // 부가세 신고용 데이터
      supplyAmount, // 공급가액 (과세표준)
      vatAmount, // 부가세
      
      // 결제 방식별 통계
      paymentMethodStats,
      
      // 결제 방식별 비율
      paymentMethodRatio: {
        CARD: totalRevenue > 0 ? Math.round((paymentMethodStats.CARD.amount / totalRevenue) * 100) : 0,
        BANK_TRANSFER: totalRevenue > 0 ? Math.round((paymentMethodStats.BANK_TRANSFER.amount / totalRevenue) * 100) : 0,
        VIRTUAL_ACCOUNT: totalRevenue > 0 ? Math.round((paymentMethodStats.VIRTUAL_ACCOUNT.amount / totalRevenue) * 100) : 0,
        MOBILE: totalRevenue > 0 ? Math.round((paymentMethodStats.MOBILE.amount / totalRevenue) * 100) : 0,
        KAKAO_PAY: totalRevenue > 0 ? Math.round((paymentMethodStats.KAKAO_PAY.amount / totalRevenue) * 100) : 0,
        NAVER_PAY: totalRevenue > 0 ? Math.round((paymentMethodStats.NAVER_PAY.amount / totalRevenue) * 100) : 0,
        TOSS_PAY: totalRevenue > 0 ? Math.round((paymentMethodStats.TOSS_PAY.amount / totalRevenue) * 100) : 0,
      }
    };

    return NextResponse.json({
      data: filteredOrders,
      stats,
      success: true,
    });
  } catch (error: any) {
    console.error('정산 API 에러:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

