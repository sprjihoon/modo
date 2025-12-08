import { supabaseAdmin } from '../supabase';

export interface ShipmentWithOrder {
  id: string;
  order_id: string;
  tracking_no: string;
  pickup_tracking_no: string | null;
  delivery_tracking_no: string | null;
  carrier: string;
  status: string;
  pickup_address: string;
  pickup_address_detail: string | null;
  pickup_zipcode: string | null;
  pickup_phone: string;
  delivery_address: string;
  delivery_address_detail: string | null;
  delivery_zipcode: string | null;
  delivery_phone: string;
  customer_name: string;
  pickup_requested_at: string | null;
  pickup_completed_at: string | null;
  delivery_started_at: string | null;
  delivery_completed_at: string | null;
  tracking_events: any[];
  delivery_info: any;
  created_at: string;
  updated_at: string;
  orders: {
    id: string;
    order_number: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    item_name: string | null;
    clothing_type: string;
    repair_type: string;
    status: string;
    total_price: number;
  } | null;
  isDelayed?: boolean;
  delayDays?: number;
  // 수거 지연 정보
  isPickupDelayed?: boolean;
  pickupDelayDays?: number;
  expectedPickupDate?: string | null;
  // 배송 지연 정보
  isDeliveryDelayed?: boolean;
  deliveryDelayDays?: number;
  expectedDeliveryDate?: string | null;
  // 기타 정보
  isIsland?: boolean;
  isSaturdayClosed?: boolean;
  notifyMsg?: string;
  saturdayClosedMessage?: string;
}

export interface ShipmentsResponse {
  data: ShipmentWithOrder[];
  stats: {
    total: number;
    pickupPending: number;
    pickupCompleted: number;
    inDelivery: number;
    delivered: number;
    delayed: number;
    pickupDelayed: number;
    deliveryDelayed: number;
    island: number;
    saturdayClosed: number;
  };
  success: boolean;
}

/**
 * 배송 목록 조회
 */
export async function getShipments(filters?: {
  filter?: 'all' | 'pickup' | 'delivery' | 'delayed' | 'island';
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ShipmentsResponse & { totalCount?: number }> {
  const params = new URLSearchParams();
  
  if (filters?.filter) {
    params.append('filter', filters.filter);
  }
  if (filters?.status) {
    params.append('status', filters.status);
  }
  if (filters?.search) {
    params.append('search', filters.search);
  }
  if (filters?.startDate) {
    params.append('startDate', filters.startDate);
  }
  if (filters?.endDate) {
    params.append('endDate', filters.endDate);
  }
  if (filters?.page) {
    params.append('page', String(filters.page));
  }
  if (filters?.pageSize) {
    params.append('pageSize', String(filters.pageSize));
  }

  const response = await fetch(`/api/shipments?${params.toString()}`);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || '배송 조회 실패');
  }

  return result;
}

/**
 * 배송 취소
 */
export async function cancelShipment(orderId: string, deleteAfterCancel?: boolean) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/shipments-cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      order_id: orderId,
      delete_after_cancel: deleteAfterCancel || false,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || '배송 취소 실패');
  }

  return result;
}

