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
import { generateTrackingNo } from '../_shared/tracking.ts';

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
      return errorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 존재 여부 확인
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('id, tracking_no')
      .eq('id', order_id)
      .single();

    if (orderCheckError || !existingOrder) {
      return errorResponse('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // 이미 tracking_no가 있으면 중복 요청
    if (existingOrder.tracking_no) {
      return errorResponse('Shipment already booked', 400, 'ALREADY_BOOKED');
    }

    // 회수(수거) 송장번호 생성 (KPOST + yymmdd + 5자리 랜덤)
    const pickupTrackingNo = generateTrackingNo();
    
    // label_url 생성 (실제로는 우체국 API에서 받아옴)
    const labelUrl = `https://service.epost.go.kr/label/${pickupTrackingNo}.pdf`;
    const pickupDate = new Date().toISOString().split('T')[0];

    // TODO: 실제 우체국 API 연동 (수거 송장 발급)
    // const epostPickupResponse = await fetch('https://service.epost.go.kr/api/collect/book', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('EPOST_API_KEY')}` },
    //   body: JSON.stringify({ 
    //     pickup: { address: pickup_address, phone: pickup_phone },
    //     delivery: { address: delivery_address, phone: delivery_phone },
    //   })
    // });
    // const pickupTrackingNo = epostPickupResponse.tracking_no;

    // 송장 정보를 DB에 저장 (upsert)
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .upsert({
        order_id,
        tracking_no: pickupTrackingNo, // 하위 호환성 (기존 필드)
        pickup_tracking_no: pickupTrackingNo, // 회수 송장번호
        delivery_tracking_no: null, // 발송은 나중에 출고 시 생성
        pickup_address,
        pickup_phone: pickup_phone || '',
        delivery_address,
        delivery_phone: delivery_phone || '',
        customer_name: customer_name || '',
        status: 'BOOKED',
        carrier: 'EPOST',
        pickup_requested_at: new Date().toISOString(),
      }, {
        onConflict: 'order_id',
      })
      .select()
      .single();

    if (shipmentError) {
      console.error('Shipment upsert error:', shipmentError);
      return errorResponse('Failed to create shipment', 500, 'DB_ERROR');
    }

    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        tracking_no: pickupTrackingNo, // 하위 호환성
        status: 'BOOKED',
      })
      .eq('id', order_id);

    if (orderError) {
      console.error('Order update error:', orderError);
      return errorResponse('Failed to update order', 500, 'DB_ERROR');
    }

    // 알림 생성 (선택사항)
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: shipment.order_id, // TODO: 실제 user_id 가져오기
        type: 'SHIPMENT_BOOKED',
        title: '수거예약 완료',
        body: `회수 송장번호 ${pickupTrackingNo}로 수거가 예약되었습니다.`,
        order_id,
        tracking_no: pickupTrackingNo,
      });

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
      // 알림 실패는 전체 프로세스를 중단하지 않음
    }

    // 성공 응답
    return successResponse(
      {
        tracking_no: pickupTrackingNo, // 하위 호환성
        pickup_tracking_no: pickupTrackingNo, // 회수 송장번호
        delivery_tracking_no: null, // 발송은 나중에
        label_url: labelUrl,
        status: 'BOOKED',
        message: '수거예약이 완료되었습니다',
        pickup_date: pickupDate,
        shipment,
      },
      201
    );

  } catch (error) {
    console.error('Shipments book error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

