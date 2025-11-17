/**
 * 소포신청 취소 API
 * POST /shipments-cancel
 * 
 * 우체국 소포신청을 취소하고 DB 업데이트
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { cancelOrder } from '../_shared/epost.ts';

interface ShipmentCancelRequest {
  order_id: string;
  delete_after_cancel?: boolean; // 취소 후 삭제 여부
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
    const body: ShipmentCancelRequest = await req.json();
    const { order_id, delete_after_cancel } = body;

    if (!order_id) {
      return errorResponse('Missing order_id', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // shipments 테이블에서 송장 정보 조회
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (shipmentError || !shipment) {
      return errorResponse('Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
    }

    // 취소 가능 여부 확인
    if (shipment.status === 'PICKED_UP' || shipment.status === 'IN_TRANSIT') {
      return errorResponse('이미 집하완료된 소포는 취소할 수 없습니다', 400, 'CANNOT_CANCEL');
    }

    // 주문 정보 조회 (apprNo 가져오기)
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    // 계약 승인번호 (환경변수 또는 기본값)
    const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';
    const apprNo = Deno.env.get('EPOST_APPROVAL_NO') || '0000000000';

    // tracking_events에서 reqNo, resNo 가져오기
    const trackingEvents = (shipment.tracking_events as any[]) || [];
    const firstEvent = trackingEvents[0] || {};
    const reqNo = firstEvent.reqNo || '';
    const resNo = firstEvent.resNo || '';

    // 우체국 API 취소 호출
    let cancelResult;
    try {
      cancelResult = await cancelOrder({
        custNo,
        apprNo,
        reqType: '1',
        reqNo,
        resNo,
        regiNo: shipment.pickup_tracking_no || shipment.tracking_no,
        delYn: delete_after_cancel ? 'Y' : 'N',
      });

      console.log('✅ 우체국 소포신청 취소 성공:', cancelResult.canceledYn);
    } catch (e) {
      console.error('❌ 우체국 취소 실패:', e.message);
      
      // 우체국 API 실패해도 DB는 업데이트
      // (이미 처리가 진행된 경우 등)
      if (e.message.includes('취소')) {
        return errorResponse(e.message, 400, 'CANCEL_FAILED');
      }
    }

    // shipments 테이블 업데이트
    if (delete_after_cancel) {
      // 완전 삭제
      await supabase
        .from('shipments')
        .delete()
        .eq('order_id', order_id);
    } else {
      // 상태만 취소로 변경
      await supabase
        .from('shipments')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);
    }

    // orders 테이블도 업데이트
    await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        tracking_no: null,
      })
      .eq('id', order_id);

    // 성공 응답
    return successResponse({
      order_id,
      cancelled: true,
      deleted: delete_after_cancel,
      message: delete_after_cancel 
        ? '수거예약이 취소되고 삭제되었습니다' 
        : '수거예약이 취소되었습니다',
      epost_result: cancelResult || null,
    });

  } catch (error) {
    console.error('Shipments cancel error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});


