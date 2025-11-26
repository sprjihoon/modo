/**
 * 소포신청 취소 API
 * POST /shipments-cancel
 * 
 * 우체국 소포신청을 취소하고 DB 업데이트
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { cancelOrder } from '../_shared/epost/index.ts';

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

    // 주문 정보 조회
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    // 계약 고객번호
    const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';

    // tracking_events에서 reqNo, resNo, apprNo 가져오기
    const trackingEvents = (shipment.tracking_events as any[]) || [];
    const firstEvent = trackingEvents[0] || {};
    const reqNo = firstEvent.reqNo || '';
    const resNo = firstEvent.resNo || '';
    // 수거 예약 시 사용한 승인번호 사용 (중요: 환경변수와 다를 수 있음)
    const apprNo = firstEvent.apprNo || Deno.env.get('EPOST_APPROVAL_NO') || '0000000000';

    console.log('🔍 취소 파라미터 확인:', {
      reqNo,
      resNo,
      apprNo,
      regiNo: shipment.pickup_tracking_no || shipment.tracking_no,
    });

    // reqYmd: 소포신청 등록일자 (YYYYMMDD 형식)
    // pickup_requested_at 또는 created_at에서 가져오기
    let reqYmd = '';
    if (shipment.pickup_requested_at) {
      const date = new Date(shipment.pickup_requested_at);
      reqYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    } else if (shipment.created_at) {
      const date = new Date(shipment.created_at);
      reqYmd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    } else {
      // 기본값: 오늘 날짜
      const today = new Date();
      reqYmd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    }

    console.log('📅 신청일자(reqYmd):', reqYmd);

    // 우체국 API 취소 호출
    let cancelResult;
    try {
      cancelResult = await cancelOrder({
        custNo,
        apprNo, // tracking_events에서 가져온 승인번호 사용
        reqType: '1',
        reqNo,
        resNo,
        regiNo: shipment.pickup_tracking_no || shipment.tracking_no,
        reqYmd, // 소포신청 등록일자 추가
        delYn: delete_after_cancel ? 'Y' : 'N',
      });

      console.log('✅ 우체국 소포신청 취소 성공:', cancelResult.canceledYn);
      
      // 우체국 API 응답 확인
      if (!cancelResult || !cancelResult.canceledYn) {
        console.warn('⚠️ 우체국 API 응답에 canceledYn이 없습니다:', cancelResult);
      }
    } catch (e) {
      console.error('❌ 우체국 취소 실패:', e.message);
      
      // 우체국 API 실패 시 에러 반환 (DB 업데이트하지 않음)
      return errorResponse(
        `우체국 전산 취소 실패: ${e.message || '알 수 없는 오류'}`,
        500,
        'EPOST_CANCEL_FAILED'
      );
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


