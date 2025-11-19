import { supabaseAdmin } from '../supabase';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  default_address?: string;
  default_address_detail?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
}

/**
 * 고객 목록 조회
 */
export async function getCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`
      name.ilike.%${filters.search}%,
      email.ilike.%${filters.search}%,
      phone.ilike.%${filters.search}%
    `);
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
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) throw error;

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
 */
export async function getCustomerStats() {
  // 전체 고객 수
  const { count: totalCustomers, error: totalError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (totalError) throw totalError;

  // 이번 달 신규 고객 수
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: newCustomers, error: newError } = await supabaseAdmin
    .from('users')
    .select('*', { count: 'exact', head: true })
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

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    activeCustomers: activeCount,
    totalSales,
  };
}

