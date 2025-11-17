/**
 * 배송추적 조회 API
 * GET /shipments-track?tracking_no=xxx
 * 
 * 우체국 소포신청 확인 API로 배송 상태 조회
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { getResInfo } from '../_shared/epost.ts';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // GET 요청만 허용
    if (req.method !== 'GET') {
      return errorResponse('Method not allowed', 405);
    }

    // URL 파라미터 파싱
    const url = new URL(req.url);
    const trackingNo = url.searchParams.get('tracking_no');

    if (!trackingNo) {
      return errorResponse('Missing tracking_no parameter', 400, 'MISSING_TRACKING_NO');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // shipments 테이블에서 송장 정보 조회
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .or(`pickup_tracking_no.eq.${trackingNo},delivery_tracking_no.eq.${trackingNo},tracking_no.eq.${trackingNo}`)
      .single();

    if (shipmentError || !shipment) {
      return errorResponse('Shipment not found', 404, 'SHIPMENT_NOT_FOUND');
    }

    // 주문 정보 조회
    const { data: order } = await supabase
      .from('orders')
      .select('id, created_at')
      .eq('id', shipment.order_id)
      .single();

    // 우체국 API로 실시간 배송 상태 조회
    let epostStatus = null;
    try {
      const reqYmd = shipment.pickup_requested_at 
        ? new Date(shipment.pickup_requested_at).toISOString().split('T')[0].replace(/-/g, '')
        : new Date().toISOString().split('T')[0].replace(/-/g, '');

      epostStatus = await getResInfo({
        custNo: Deno.env.get('EPOST_CUSTOMER_ID') || '',
        reqType: '1',
        orderNo: shipment.order_id,
        reqYmd,
      });

      console.log('✅ 우체국 배송 상태 조회 성공:', epostStatus.treatStusCd);
    } catch (e) {
      console.error('⚠️ 우체국 배송 상태 조회 실패:', e.message);
      // 실패해도 DB의 정보는 반환
    }

    // 배송 추적 URL 생성
    const trackingUrl = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`;

    // 응답
    return successResponse({
      tracking_no: trackingNo,
      tracking_url: trackingUrl,
      shipment: {
        order_id: shipment.order_id,
        status: shipment.status,
        carrier: shipment.carrier,
        pickup_tracking_no: shipment.pickup_tracking_no,
        delivery_tracking_no: shipment.delivery_tracking_no,
        pickup_requested_at: shipment.pickup_requested_at,
        pickup_completed_at: shipment.pickup_completed_at,
        delivery_started_at: shipment.delivery_started_at,
        delivery_completed_at: shipment.delivery_completed_at,
        tracking_events: shipment.tracking_events || [],
      },
      epost: epostStatus ? {
        reqNo: epostStatus.reqNo,
        resNo: epostStatus.resNo,
        regiNo: epostStatus.regiNo,
        regiPoNm: epostStatus.regiPoNm,
        resDate: epostStatus.resDate,
        treatStusCd: epostStatus.treatStusCd,
        treatStusNm: getTreatStatusName(epostStatus.treatStusCd),
      } : null,
    });

  } catch (error) {
    console.error('Shipments track error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

/**
 * 소포 처리상태 코드를 이름으로 변환
 */
function getTreatStatusName(code: string): string {
  const statusMap: Record<string, string> = {
    '00': '신청준비',
    '01': '소포신청',
    '02': '운송장출력',
    '03': '집하완료',
    '04': '미집하',
    '05': '신청취소',
  };
  return statusMap[code] || '알 수 없음';
}


