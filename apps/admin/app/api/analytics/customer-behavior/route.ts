import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 고객 행동 분석 API
 * GET: 고객 이벤트 조회 및 통계
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview'; // overview, funnel, user, event
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '100');

    // 기본 쿼리
    let query = supabaseAdmin
      .from('customer_events')
      .select('*');

    // 날짜 필터
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 사용자 필터
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // 이벤트 타입 필터
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    switch (type) {
      case 'overview': {
        // 전체 개요 통계
        const stats = await getOverviewStats(startDate, endDate);
        return NextResponse.json({ success: true, data: stats });
      }

      case 'funnel': {
        // 퍼널 분석
        const funnelData = await getFunnelAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: funnelData });
      }

      case 'session': {
        // 세션 분석 (신규)
        const sessionData = await getSessionAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: sessionData });
      }

      case 'time-pattern': {
        // 시간 패턴 분석 (신규)
        const timeData = await getTimePatternAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: timeData });
      }

      case 'device': {
        // 디바이스 분석 (신규)
        const deviceData = await getDeviceAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: deviceData });
      }

      case 'segment': {
        // 고객 세그먼트 분석 (신규)
        const segmentData = await getSegmentAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: segmentData });
      }

      case 'user': {
        // 특정 사용자의 행동 분석
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }

      case 'event': {
        // 이벤트별 통계
        const eventStats = await getEventStats(eventType, startDate, endDate);
        return NextResponse.json({ success: true, data: eventStats });
      }

      case 'dropoff': {
        // 이탈 지점 분석
        const dropoffData = await getDropoffAnalysis(startDate, endDate);
        return NextResponse.json({ success: true, data: dropoffData });
      }

      default: {
        // 기본 이벤트 목록
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }
  } catch (error: any) {
    console.error('고객 행동 분석 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 전체 개요 통계
 */
async function getOverviewStats(startDate?: string | null, endDate?: string | null) {
  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = `AND created_at BETWEEN '${startDate}' AND '${endDate}'`;
  } else if (startDate) {
    dateFilter = `AND created_at >= '${startDate}'`;
  } else if (endDate) {
    dateFilter = `AND created_at <= '${endDate}'`;
  }

  // 전체 이벤트 수
  const { data: totalEvents } = await supabaseAdmin
    .rpc('count_customer_events', { filter: dateFilter })
    .single();

  // 고유 사용자 수
  const { data: uniqueUsers } = await supabaseAdmin
    .from('customer_events')
    .select('user_id', { count: 'exact', head: false })
    .not('user_id', 'is', null);

  // 이벤트 타입별 카운트
  const { data: eventTypeCounts } = await supabaseAdmin.rpc('get_event_type_counts', {
    start_date: startDate,
    end_date: endDate,
  });

  // 장바구니 관련 통계
  const { data: cartStats } = await supabaseAdmin
    .from('customer_events')
    .select('event_type', { count: 'exact', head: false })
    .in('event_type', ['CART_ADD', 'CART_REMOVE', 'CART_CLEAR']);

  // 주문 관련 통계
  const { data: orderStats } = await supabaseAdmin
    .from('customer_events')
    .select('event_type, metadata')
    .in('event_type', [
      'ORDER_START',
      'ORDER_PAYMENT_START',
      'ORDER_PAYMENT_SUCCESS',
      'ORDER_PAYMENT_FAIL',
      'ORDER_COMPLETE'
    ]);

  // 통계 집계
  const cartAddCount = orderStats?.filter(e => e.event_type === 'CART_ADD').length || 0;
  const cartRemoveCount = orderStats?.filter(e => e.event_type === 'CART_REMOVE').length || 0;
  const orderStartCount = orderStats?.filter(e => e.event_type === 'ORDER_START').length || 0;
  const paymentStartCount = orderStats?.filter(e => e.event_type === 'ORDER_PAYMENT_START').length || 0;
  const paymentSuccessCount = orderStats?.filter(e => e.event_type === 'ORDER_PAYMENT_SUCCESS').length || 0;
  const paymentFailCount = orderStats?.filter(e => e.event_type === 'ORDER_PAYMENT_FAIL').length || 0;

  return {
    totalEvents: totalEvents || 0,
    uniqueUsers: uniqueUsers?.length || 0,
    cart: {
      added: cartAddCount,
      removed: cartRemoveCount,
      netAdditions: cartAddCount - cartRemoveCount,
    },
    orders: {
      started: orderStartCount,
      paymentAttempted: paymentStartCount,
      completed: paymentSuccessCount,
      failed: paymentFailCount,
      conversionRate: orderStartCount > 0 
        ? ((paymentSuccessCount / orderStartCount) * 100).toFixed(2) 
        : 0,
    },
    eventTypeCounts: eventTypeCounts || [],
  };
}

/**
 * 퍼널 분석
 */
async function getFunnelAnalysis(startDate?: string | null, endDate?: string | null) {
  let query = supabaseAdmin.from('customer_events').select('event_type, user_id, session_id');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: events, error } = await query;

  if (error) throw error;

  // 퍼널 단계 정의
  const funnelStages = [
    { name: '앱 실행', eventTypes: ['APP_OPEN', 'PAGE_VIEW'] },
    { name: '상품 조회', eventTypes: ['PRODUCT_VIEW', 'REPAIR_MENU_VIEW'] },
    { name: '장바구니 추가', eventTypes: ['CART_ADD'] },
    { name: '주문 시작', eventTypes: ['ORDER_START'] },
    { name: '결제 시도', eventTypes: ['ORDER_PAYMENT_START'] },
    { name: '결제 완료', eventTypes: ['ORDER_PAYMENT_SUCCESS'] },
  ];

  const funnel = funnelStages.map((stage, index) => {
    const usersInStage = new Set(
      events
        ?.filter(e => stage.eventTypes.includes(e.event_type))
        .map(e => e.user_id || e.session_id)
    );

    const count = usersInStage.size;
    const previousCount = index > 0 
      ? new Set(
          events
            ?.filter(e => funnelStages[index - 1].eventTypes.includes(e.event_type))
            .map(e => e.user_id || e.session_id)
        ).size
      : count;

    return {
      stage: stage.name,
      count,
      dropoffCount: index > 0 ? previousCount - count : 0,
      dropoffRate: index > 0 && previousCount > 0
        ? (((previousCount - count) / previousCount) * 100).toFixed(2)
        : 0,
      conversionRate: index > 0 && previousCount > 0
        ? ((count / previousCount) * 100).toFixed(2)
        : 100,
    };
  });

  return funnel;
}

/**
 * 이벤트별 통계
 */
async function getEventStats(
  eventType?: string | null,
  startDate?: string | null,
  endDate?: string | null
) {
  let query = supabaseAdmin
    .from('customer_events')
    .select('event_type', { count: 'exact', head: false });

  if (eventType) {
    query = query.eq('event_type', eventType);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { count, error } = await query;

  if (error) throw error;

  return {
    eventType,
    count: count || 0,
  };
}

/**
 * 이탈 지점 분석
 */
async function getDropoffAnalysis(startDate?: string | null, endDate?: string | null) {
  let query = supabaseAdmin
    .from('customer_events')
    .select('event_type, user_id, session_id, created_at');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: events, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;

  // 세션별 마지막 이벤트 분석
  const sessionLastEvents = new Map<string, { event_type: string; created_at: string }>();
  
  events?.forEach(event => {
    const sessionKey = event.user_id || event.session_id;
    if (sessionKey) {
      sessionLastEvents.set(sessionKey, {
        event_type: event.event_type,
        created_at: event.created_at,
      });
    }
  });

  // 이탈 지점별 카운트
  const dropoffPoints: Record<string, number> = {};
  sessionLastEvents.forEach(({ event_type }) => {
    dropoffPoints[event_type] = (dropoffPoints[event_type] || 0) + 1;
  });

  // 정렬 및 퍼센트 계산
  const totalSessions = sessionLastEvents.size;
  const dropoffAnalysis = Object.entries(dropoffPoints)
    .map(([eventType, count]) => ({
      eventType,
      count,
      percentage: ((count / totalSessions) * 100).toFixed(2),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSessions,
    dropoffPoints: dropoffAnalysis,
  };
}

/**
 * 이벤트 기록 API
 * POST: 새로운 고객 이벤트 기록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      session_id,
      event_type,
      event_name,
      page_url,
      page_title,
      referrer,
      target_id,
      target_type,
      metadata,
      device_type,
      device_os,
      device_model,
      app_version,
      ip_address,
      country,
      city,
    } = body;

    if (!event_type) {
      return NextResponse.json(
        { success: false, error: 'event_type is required' },
        { status: 400 }
      );
    }

    // 이벤트 기록
    const { data, error } = await supabaseAdmin
      .from('customer_events')
      .insert({
        user_id,
        session_id,
        event_type,
        event_name,
        page_url,
        page_title,
        referrer,
        target_id,
        target_type,
        metadata: metadata || {},
        device_type,
        device_os,
        device_model,
        app_version,
        ip_address,
        country,
        city,
      })
      .select()
      .single();

    if (error) {
      console.error('이벤트 기록 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('이벤트 기록 API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

