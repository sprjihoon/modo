import { supabase } from '../supabase';

/**
 * 주문 목록 조회
 */
export async function getOrders(filters?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      shipments (*),
      payments (*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    const searchValue = `%${filters.search}%`;
    query = query.or(`id.ilike.${searchValue},tracking_no.ilike.${searchValue},customer_name.ilike.${searchValue}`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * 주문 상세 조회
 */
export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      shipments (
        *,
        videos (*)
      ),
      payments (*)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 주문 상태 변경
 */
export async function updateOrderStatus(
  orderId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 송장 상태 변경
 */
export async function updateShipmentStatus(
  trackingNo: string,
  status: string
) {
  const { data, error } = await supabase
    .from('shipments')
    .update({ status })
    .eq('tracking_no', trackingNo)
    .select()
    .single();

  if (error) throw error;
  
  // orders 상태도 동기화
  await supabase
    .from('orders')
    .update({ status })
    .eq('tracking_no', trackingNo);

  return data;
}

