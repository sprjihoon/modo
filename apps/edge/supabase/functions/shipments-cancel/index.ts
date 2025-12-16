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

    // tracking_events에서 reqNo, resNo, apprNo, reqType, payType 가져오기
    const trackingEvents = (shipment.tracking_events as any[]) || [];
    const firstEvent = trackingEvents[0] || {};
    const reqNo = firstEvent.reqNo || '';
    const resNo = firstEvent.resNo || '';
    // 수거 예약 시 사용한 승인번호 사용 (중요: 환경변수와 다를 수 있음)
    const apprNo = firstEvent.apprNo || Deno.env.get('EPOST_APPROVAL_NO') || '0000000000';
    // 수거 예약 시 사용한 reqType과 payType 사용 (중요: 취소 시 신청 시와 동일해야 함)
    // reqType: '1'=일반소포, '2'=반품소포
    // payType: '1'=일반(즉납/후납), '2'=착불(수취인 부담)
    const reqType = (firstEvent.reqType || '2') as '1' | '2'; // 기본값: '2' (반품소포, 수거지시)
    const payType = (firstEvent.payType || '2') as '1' | '2'; // 기본값: '2' (착불)

    console.log('🔍 취소 파라미터 확인:', {
      reqNo,
      resNo,
      apprNo,
      reqType, // 소포신청 구분 (1:일반소포, 2:반품소포)
      payType, // 요금 납부 구분 (1:일반, 2:착불)
      regiNo: shipment.pickup_tracking_no || shipment.tracking_no,
      note: 'reqType과 payType은 수거 신청 시 사용한 값과 동일해야 합니다',
      warning: payType ? '✅ payType이 설정되었습니다' : '⚠️ payType이 없습니다 (이전 데이터일 수 있음)',
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
    // ⚠️ 중요: reqType과 payType은 수거 신청 시 사용한 값과 동일해야 함
    // 수거지시는 reqType='2' (반품소포), payType='2' (착불)로 신청되므로
    // 취소 시에도 동일한 값을 사용해야 함
    let cancelResult;
    try {
      cancelResult = await cancelOrder({
        custNo,
        apprNo, // tracking_events에서 가져온 승인번호 사용
        reqType, // tracking_events에서 가져온 reqType 사용 (수거 신청 시와 동일)
        payType, // tracking_events에서 가져온 payType 사용 (수거 신청 시와 동일) - API 매뉴얼에 맞게 추가
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
      
      // ERR-123: 예약 정보가 없는 경우 (Mock 또는 testYn=Y로 생성된 경우)
      // 이 경우 DB만 업데이트하고 성공으로 처리
      const isNoReservationError = e.message?.includes('ERR-123') || 
                                    e.message?.includes('예약된 정보가 없습니다') ||
                                    e.message?.includes('접수정보로 예약된 정보가 없');
      
      if (isNoReservationError) {
        console.warn('⚠️ 우체국에 예약 정보가 없습니다. DB만 업데이트합니다.');
        console.warn('   이는 테스트 모드나 Mock으로 생성된 주문일 수 있습니다.');
        cancelResult = {
          canceledYn: 'Y',
          note: '우체국 예약 정보 없음 (DB만 업데이트)'
        };
      } else {
        // 다른 에러의 경우 실패 처리
        return errorResponse(
          `우체국 전산 취소 실패: ${e.message || '알 수 없는 오류'}`,
          500,
          'EPOST_CANCEL_FAILED'
        );
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


