/**
 * 발송 송장 발급 API
 * POST /shipments-issue-delivery
 * 
 * 출고 시 우체국 API로 발송 송장번호 발급
 * READY_TO_SHIP 상태에서 호출
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { generateTrackingNo } from '../_shared/tracking.ts';

interface DeliveryIssueRequest {
  order_id: string;
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
    const body: DeliveryIssueRequest = await req.json();
    const { order_id } = body;

    // 필수 필드 검증
    if (!order_id) {
      return errorResponse('Missing required field: order_id', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 및 shipment 조회
    const { data: shipment, error: shipmentCheckError } = await supabase
      .from('shipments')
      .select('*, orders!inner(*)')
      .eq('order_id', order_id)
      .eq('orders.id', order_id)
      .single();

    if (shipmentCheckError || !shipment) {
      return errorResponse('Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
    }

    // 이미 발송 송장이 있으면 중복 요청
    if (shipment.delivery_tracking_no) {
      return errorResponse('Delivery tracking already issued', 400, 'ALREADY_ISSUED');
    }

    // READY_TO_SHIP 상태가 아니면 발급 불가
    if (shipment.status !== 'READY_TO_SHIP') {
      return errorResponse('Order must be in READY_TO_SHIP status', 400, 'INVALID_STATUS');
    }

    // 발송 송장번호 생성
    const deliveryTrackingNo = generateTrackingNo();
    
    // label_url 생성
    const labelUrl = `https://service.epost.go.kr/label/${deliveryTrackingNo}.pdf`;

    // TODO: 실제 우체국 API 연동 (발송 송장 발급)
    // const epostDeliveryResponse = await fetch('https://service.epost.go.kr/api/shipment/create', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('EPOST_API_KEY')}` },
    //   body: JSON.stringify({
    //     sender: { address: '수선센터 주소', phone: '센터 전화번호' },
    //     recipient: { 
    //       address: shipment.delivery_address, 
    //       phone: shipment.delivery_phone,
    //       name: shipment.customer_name 
    //     },
    //   })
    // });
    // const deliveryTrackingNo = epostDeliveryResponse.tracking_no;

    // DB 업데이트
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        delivery_tracking_no: deliveryTrackingNo,
        delivery_started_at: new Date().toISOString(),
        status: 'OUT_FOR_DELIVERY', // 배송 중으로 변경
      })
      .eq('order_id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Shipment update error:', updateError);
      return errorResponse('Failed to update shipment', 500, 'DB_ERROR');
    }

    // 주문 상태도 업데이트
    await supabase
      .from('orders')
      .update({ status: 'OUT_FOR_DELIVERY' })
      .eq('id', order_id);

    // 알림 생성
    await supabase
      .from('notifications')
      .insert({
        user_id: shipment.order_id, // TODO: 실제 user_id
        type: 'DELIVERY_STARTED',
        title: '배송 시작',
        body: `발송 송장번호 ${deliveryTrackingNo}로 배송이 시작되었습니다.`,
        order_id,
        tracking_no: deliveryTrackingNo,
      });

    // 성공 응답
    return successResponse(
      {
        pickup_tracking_no: shipment.pickup_tracking_no,
        delivery_tracking_no: deliveryTrackingNo,
        label_url: labelUrl,
        status: 'OUT_FOR_DELIVERY',
        message: '발송 송장이 발급되었습니다',
        shipment: updatedShipment,
      },
      201
    );

  } catch (error) {
    console.error('Delivery issue error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

