/**
 * 수거예약 및 송장발급 API
 * POST /shipments-book
 * 
 * 우체국 API 연동하여 수거예약 + 송장 선발행
 * tracking_no를 생성하고 반환
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface ShipmentBookRequest {
  order_id: string;
  pickup_address: string;
  pickup_phone: string;
  delivery_address: string;
  delivery_phone: string;
  customer_name: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 요청 본문 파싱
    const body: ShipmentBookRequest = await req.json();
    const { order_id, pickup_address, pickup_phone, delivery_address, delivery_phone, customer_name } = body;

    // 필수 필드 검증
    if (!order_id || !pickup_address || !delivery_address) {
      return errorResponse('Missing required fields', 400);
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // TODO: 실제 우체국 API 연동
    // 현재는 Mock 데이터 반환
    const mockTrackingNo = `MOCK${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 송장 정보를 DB에 저장
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        order_id,
        tracking_no: mockTrackingNo,
        pickup_address,
        pickup_phone,
        delivery_address,
        delivery_phone,
        customer_name,
        status: 'BOOKED',
        carrier: 'EPOST',
      })
      .select()
      .single();

    if (shipmentError) {
      console.error('Shipment insert error:', shipmentError);
      return errorResponse('Failed to create shipment', 500);
    }

    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        tracking_no: mockTrackingNo,
        status: 'BOOKED',
      })
      .eq('id', order_id);

    if (orderError) {
      console.error('Order update error:', orderError);
      return errorResponse('Failed to update order', 500);
    }

    // 성공 응답
    return successResponse(
      {
        tracking_no: mockTrackingNo,
        label_url: `https://mock.epost.go.kr/label/${mockTrackingNo}.pdf`,
        status: 'BOOKED',
        message: '수거예약이 완료되었습니다',
        pickup_date: new Date().toISOString().split('T')[0],
        shipment,
      },
      201
    );

  } catch (error) {
    console.error('Shipments book error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

