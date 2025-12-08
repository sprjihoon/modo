import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 관리자용 주문 조회 API
 * Service Role Key를 사용하여 RLS 우회, 모든 주문 조회 가능
 * 날짜 필터링 및 페이징 지원
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 기본 쿼리
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        promotion_codes:promotion_code_id (code, discount_type, discount_value)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // 상태 필터
    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    // 날짜 필터
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    // 검색어 필터 (서버 사이드)
    if (search) {
      query = query.or(`
        order_number.ilike.%${search}%,
        customer_name.ilike.%${search}%,
        customer_email.ilike.%${search}%,
        tracking_no.ilike.%${search}%,
        item_name.ilike.%${search}%
      `);
    }

    // 페이징 적용
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize - 1;
    query = query.range(startIndex, endIndex);

    const { data, error, count } = await query;

    if (error) {
      console.error('주문 조회 실패:', error);
      return NextResponse.json(
        { error: '주문 조회 실패', details: error.message },
        { status: 500 }
      );
    }

    // 통계 계산 (날짜 필터 적용된 전체 데이터 기준)
    let statsQuery = supabaseAdmin
      .from('orders')
      .select('status, total_price, promotion_discount_amount, promotion_code_id');
    
    if (startDate) {
      statsQuery = statsQuery.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      statsQuery = statsQuery.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: statsData } = await statsQuery;
    
    const stats = {
      total: statsData?.length || 0,
      pending: statsData?.filter(o => o.status === 'PENDING').length || 0,
      paid: statsData?.filter(o => o.status === 'PAID').length || 0,
      booked: statsData?.filter(o => o.status === 'BOOKED').length || 0,
      inbound: statsData?.filter(o => o.status === 'INBOUND').length || 0,
      processing: statsData?.filter(o => o.status === 'PROCESSING').length || 0,
      readyToShip: statsData?.filter(o => o.status === 'READY_TO_SHIP').length || 0,
      delivered: statsData?.filter(o => o.status === 'DELIVERED').length || 0,
      cancelled: statsData?.filter(o => o.status === 'CANCELLED').length || 0,
      promotionUsed: statsData?.filter(o => o.promotion_code_id).length || 0,
      totalDiscount: statsData?.reduce((sum, o) => sum + (o.promotion_discount_amount || 0), 0) || 0,
      totalRevenue: statsData?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0,
    };

    return NextResponse.json({ 
      data, 
      stats,
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      success: true 
    });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

