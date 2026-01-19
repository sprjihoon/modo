import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 통계 분석 API - 통합 통계 데이터 조회
 * GET /api/analytics/stats?type=orders|payments|points|images|addresses|activity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (type) {
      case 'orders':
        return NextResponse.json(await getOrderStats(startDate, endDate));
      case 'payments':
        return NextResponse.json(await getPaymentStats(startDate, endDate));
      case 'points':
        return NextResponse.json(await getPointStats());
      case 'images':
        return NextResponse.json(await getImageStats());
      case 'addresses':
        return NextResponse.json(await getAddressStats());
      case 'activity':
        return NextResponse.json(await getActivityLogs());
      case 'all':
        const [orders, payments, points, images, addresses, activity] = await Promise.all([
          getOrderStats(startDate, endDate),
          getPaymentStats(startDate, endDate),
          getPointStats(),
          getImageStats(),
          getAddressStats(),
          getActivityLogs(),
        ]);
        return NextResponse.json({
          success: true,
          orders,
          payments,
          points,
          images,
          addresses,
          activity,
        });
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('통계 API 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 주문 통계
async function getOrderStats(startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // 전체 주문
  const { data: allOrders, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, created_at, total_price');

  if (error) throw error;

  // 오늘 주문
  const todayOrders = allOrders?.filter(o => new Date(o.created_at) >= new Date(todayStart)) || [];
  // 이번 주 주문
  const weekOrders = allOrders?.filter(o => new Date(o.created_at) >= new Date(weekStart)) || [];
  // 이번 달 주문
  const monthOrders = allOrders?.filter(o => new Date(o.created_at) >= new Date(monthStart)) || [];

  // 상태별 통계
  const statusCounts = {
    booked: allOrders?.filter(o => o.status === 'BOOKED').length || 0,
    inbound: allOrders?.filter(o => o.status === 'INBOUND').length || 0,
    processing: allOrders?.filter(o => o.status === 'PROCESSING').length || 0,
    readyToShip: allOrders?.filter(o => o.status === 'READY_TO_SHIP').length || 0,
    delivered: allOrders?.filter(o => o.status === 'DELIVERED').length || 0,
  };

  return {
    success: true,
    total: allOrders?.length || 0,
    today: todayOrders.length,
    thisWeek: weekOrders.length,
    thisMonth: monthOrders.length,
    byStatus: statusCounts,
  };
}

// 결제 통계
async function getPaymentStats(startDate?: string | null, endDate?: string | null) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('payment_status, total_price, created_at, paid_at')
    .not('payment_status', 'is', null);

  if (error) throw error;

  const completedOrders = orders?.filter(o => o.payment_status === 'COMPLETED') || [];
  const todayRevenue = completedOrders
    .filter(o => o.paid_at && new Date(o.paid_at) >= new Date(todayStart))
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const weekRevenue = completedOrders
    .filter(o => o.paid_at && new Date(o.paid_at) >= new Date(weekStart))
    .reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const avgOrderValue = completedOrders.length > 0 
    ? Math.round(totalRevenue / completedOrders.length) 
    : 0;

  return {
    success: true,
    total: totalRevenue,
    today: todayRevenue,
    thisWeek: weekRevenue,
    thisMonth: totalRevenue, // 월간은 전체와 동일하게 (필요시 수정)
    average: avgOrderValue,
    completed: completedOrders.length,
    pending: orders?.filter(o => o.payment_status === 'PENDING').length || 0,
    failed: orders?.filter(o => o.payment_status === 'FAILED').length || 0,
  };
}

// 포인트 통계
async function getPointStats() {
  // 전체 포인트 거래 내역 조회
  const { data: transactions, error } = await supabaseAdmin
    .from('point_transactions')
    .select('type, amount');

  if (error) throw error;

  let totalIssued = 0;
  let totalUsed = 0;

  transactions?.forEach(transaction => {
    if (transaction.type === 'EARNED' || transaction.type === 'ADMIN_ADD') {
      totalIssued += Math.abs(transaction.amount);
    } else if (transaction.type === 'USED' || transaction.type === 'ADMIN_SUB') {
      totalUsed += Math.abs(transaction.amount);
    }
  });

  // 현재 보유 포인트 (모든 사용자의 포인트 잔액 합계)
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('point_balance');

  const totalHolding = users?.reduce((sum, user) => sum + (user.point_balance || 0), 0) || 0;
  const userCount = users?.filter(u => (u.point_balance || 0) > 0).length || 1;
  const avgPerUser = userCount > 0 ? Math.round(totalHolding / userCount) : 0;

  return {
    success: true,
    totalIssued,
    totalUsed,
    active: totalHolding,
    averagePerUser: avgPerUser,
  };
}

// 이미지 및 핀 통계
async function getImageStats() {
  // order_images 테이블에서 이미지 통계 조회
  const { data: images, error } = await supabaseAdmin
    .from('order_images')
    .select('id, pin_data');

  if (error) {
    // 테이블이 없을 수 있으므로 기본값 반환
    console.warn('order_images 테이블 조회 실패:', error.message);
    return {
      success: true,
      total: 0,
      withPins: 0,
      totalPins: 0,
      averagePinsPerImage: 0,
    };
  }

  const total = images?.length || 0;
  let withPins = 0;
  let totalPins = 0;

  images?.forEach(img => {
    if (img.pin_data && Array.isArray(img.pin_data) && img.pin_data.length > 0) {
      withPins++;
      totalPins += img.pin_data.length;
    }
  });

  return {
    success: true,
    total,
    withPins,
    totalPins,
    averagePinsPerImage: withPins > 0 ? Math.round((totalPins / withPins) * 10) / 10 : 0,
  };
}

// 배송지 통계
async function getAddressStats() {
  const { data: addresses, error } = await supabaseAdmin
    .from('addresses')
    .select('id, is_default, deleted_at');

  if (error) {
    console.warn('addresses 테이블 조회 실패:', error.message);
    return {
      success: true,
      total: 0,
      active: 0,
      default: 0,
    };
  }

  const activeAddresses = addresses?.filter(a => !a.deleted_at) || [];
  const defaultAddresses = activeAddresses.filter(a => a.is_default);

  return {
    success: true,
    total: addresses?.length || 0,
    active: activeAddresses.length,
    default: defaultAddresses.length,
  };
}

// 최근 활동 로그
async function getActivityLogs() {
  const { data: logs, error } = await supabaseAdmin
    .from('action_logs')
    .select('id, action_type, actor_name, target_order_id, timestamp, metadata')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.warn('action_logs 테이블 조회 실패:', error.message);
    return {
      success: true,
      logs: [],
    };
  }

  const formattedLogs = logs?.map(log => ({
    id: log.id,
    type: getLogType(log.action_type),
    action: getActionLabel(log.action_type),
    user: log.actor_name || '시스템',
    orderId: log.target_order_id,
    timestamp: formatTimestamp(log.timestamp),
  })) || [];

  return {
    success: true,
    logs: formattedLogs,
  };
}

// 헬퍼 함수들
function getLogType(actionType: string): string {
  if (actionType.includes('ORDER') || actionType.includes('INBOUND') || actionType.includes('OUTBOUND')) return 'order';
  if (actionType.includes('PAYMENT')) return 'payment';
  if (actionType.includes('IMAGE') || actionType.includes('VIDEO')) return 'image';
  if (actionType.includes('WORK')) return 'work';
  if (actionType.includes('EXTRA_CHARGE')) return 'extraCharge';
  return 'other';
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'SCAN_INBOUND': '입고 스캔',
    'SCAN_OUTBOUND': '출고 스캔',
    'WORK_START': '작업 시작',
    'WORK_COMPLETE': '작업 완료',
    'EXTRA_CHARGE_REQUEST': '추가금 요청',
    'EXTRA_CHARGE_APPROVE': '추가금 승인',
    'IMAGE_UPLOAD': '이미지 업로드',
    'VIDEO_UPLOAD': '영상 업로드',
    'ORDER_STATUS_UPDATE': '주문 상태 변경',
    'PAYMENT_COMPLETE': '결제 완료',
  };
  return labels[actionType] || actionType;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

