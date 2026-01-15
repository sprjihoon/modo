import { supabaseAdmin } from '../supabase';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  default_address?: string;
  default_address_detail?: string;
  point_balance?: number;
  total_earned_points?: number;
  total_used_points?: number;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
}

/**
 * 고객 목록 조회
 * - CUSTOMER 역할만 조회 (users 테이블의 user_role ENUM)
 * - 관리자는 staff 테이블에서 별도 관리됨
 */
export async function getCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', 'CUSTOMER')  // 고객만 조회 (user_role ENUM: ADMIN, MANAGER, WORKER, CUSTOMER 중 CUSTOMER만)
    .order('created_at', { ascending: false });

  if (filters?.search) {
    const searchValue = `%${filters.search}%`;
    query = query.or(`name.ilike.${searchValue},email.ilike.${searchValue},phone.ilike.${searchValue}`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;

  // 주문 통계 정보 추가
  const customersWithStats = await Promise.all(
    (data || []).map(async (customer) => {
      // 해당 고객의 주문 정보 조회
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, total_price, created_at')
        .eq('user_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('주문 정보 조회 실패:', ordersError);
      }

      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
      const lastOrderDate = orders && orders.length > 0 
        ? orders[0].created_at
        : undefined;

      return {
        ...customer,
        totalOrders,
        totalSpent,
        lastOrderDate,
      };
    })
  );

  return customersWithStats;
}

/**
 * 고객 상세 조회
 */
export async function getCustomerById(customerId: string) {
  console.log('👤 [getCustomerById] 사용자 조회:', customerId);
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  console.log('👤 [getCustomerById] 조회 결과:', { data, error });

  if (error) {
    console.error('❌ [getCustomerById] DB 오류:', error);
    throw error;
  }
  
  if (!data) {
    console.error('❌ [getCustomerById] 사용자 없음:', customerId);
    throw new Error(`사용자를 찾을 수 없습니다: ${customerId}`);
  }

  // 주문 통계 정보 추가
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, total_price, created_at, item_name, status')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('주문 정보 조회 실패:', ordersError);
  }

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
  const averageOrderValue = totalOrders > 0 ? Math.floor(totalSpent / totalOrders) : 0;

  return {
    ...data,
    totalOrders,
    totalSpent,
    averageOrderValue,
    orders: orders || [],
  };
}

/**
 * 고객 통계 조회
 * - CUSTOMER 역할만 집계 (users 테이블의 user_role ENUM)
 */
export async function getCustomerStats() {
  // 전체 고객 수 (CUSTOMER만)
  const { count: totalCustomers, error: totalError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'CUSTOMER');

  if (totalError) throw totalError;

  // 이번 달 신규 고객 수 (CUSTOMER만)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: newCustomers, error: newError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'CUSTOMER')
    .gte('created_at', startOfMonth.toISOString());

  if (newError) throw newError;

  // 활성 고객 수 (최근 30일 내 주문한 고객)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activeCustomers, error: activeError } = await supabaseAdmin
    .from('orders')
    .select('user_id')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (activeError) throw activeError;

  const activeCustomerIds = new Set(activeCustomers?.map((o) => o.user_id) || []);
  const activeCount = activeCustomerIds.size;

  // 총 매출
  const { data: allOrders, error: salesError } = await supabaseAdmin
    .from('orders')
    .select('total_price');

  if (salesError) throw salesError;

  const totalSales = allOrders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

  // 탈퇴 회원 수 (CUSTOMER 역할 중 이메일이 deleted_ 패턴인 경우만)
  // 주의: auth_id가 null인 것만으로는 탈퇴 회원으로 판단하지 않음 (게스트 사용자일 수 있음)
  const { count: deletedCustomers, error: deletedError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'CUSTOMER')
    .like('email', 'deleted_%@deleted.modorepair.com');

  if (deletedError) {
    console.warn('탈퇴 회원 수 조회 실패:', deletedError);
  }

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    activeCustomers: activeCount,
    deletedCustomers: deletedCustomers || 0,
    totalSales,
  };
}

