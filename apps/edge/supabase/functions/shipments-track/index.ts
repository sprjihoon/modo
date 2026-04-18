/**
 * 배송추적 조회 API
 * GET /shipments-track?tracking_no=xxx
 * 
 * 우체국 소포신청 확인 API로 배송 상태 조회
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { getResInfo, getTrackingInfo, getStatusFromEvents } from '../_shared/epost/index.ts';
import type { TrackingEvent, TrackingResponse } from '../_shared/epost/index.ts';

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // GET 또는 POST 요청 허용
    let trackingNo: string | null = null;
    
    if (req.method === 'GET') {
      // GET 요청: URL 파라미터에서 추출
      const url = new URL(req.url);
      trackingNo = url.searchParams.get('tracking_no');
    } else if (req.method === 'POST') {
      // POST 요청: body에서 추출
      const body = await req.json();
      trackingNo = body.tracking_no || null;
    } else {
      return errorResponse('Method not allowed', 405);
    }

    if (!trackingNo) {
      return errorResponse('Missing tracking_no parameter', 400, 'MISSING_TRACKING_NO');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // shipments 테이블에서 송장 정보 조회
    let { data: shipment, error: shipmentError } = await supabase
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
    let epostStatus: any = null;
    let epostError: { message: string; code: string } | null = null;
    let trackingInfo: TrackingResponse | null = null;

    // 1. 우체국 웹 스크래핑 (1순위)
    try {
      console.log('🔍 우체국 웹 스크래핑 시작:', trackingNo);
      trackingInfo = await getTrackingInfo(trackingNo);
      console.log('📦 스크래핑 결과:', {
        success: trackingInfo.success,
        eventCount: trackingInfo.events.length,
        error: trackingInfo.error,
      });

      if (trackingInfo.success && trackingInfo.events.length > 0) {
        console.log('✅ 웹 스크래핑 성공:', trackingInfo.events.length, '건');
        const statusCode = getStatusFromEvents(trackingInfo.events);
        epostStatus = {
          treatStusCd: statusCode,
          deliveryStatus: trackingInfo.deliveryStatus,
          senderName: trackingInfo.senderName,
          receiverName: trackingInfo.receiverName,
        };
        // 성공 시 이벤트를 DB에 저장 (이후 API 실패 시 fallback)
        try {
          const eventsToStore = trackingInfo.events.map((e: TrackingEvent) => ({
            date: e.date, time: e.time, location: e.location,
            status: e.status, description: e.description || null,
          }));
          await supabase.from('shipments').update({ tracking_events: eventsToStore }).eq('id', shipment.id);
          console.log('✅ 추적 이벤트 DB 저장 완료:', eventsToStore.length, '건');
        } catch (saveErr: any) {
          console.warn('⚠️ 이벤트 DB 저장 실패 (무시):', saveErr?.message);
        }
      }
    } catch (err: any) {
      console.error('⚠️ 웹 스크래핑 실패:', err?.message);
    }

    // 2. 스크래핑 실패 시 GetResInfo API (2순위)
    if (!epostStatus) {
      try {
        console.log('⚠️ 스크래핑 데이터 없음, GetResInfo API로 폴백');
        
        // delivery_info에서 원래 신청일자 가져오기 (더 정확함)
        const deliveryInfo = shipment.delivery_info as Record<string, any> | null;
        let reqYmd: string;
        
        if (deliveryInfo?.resDate) {
          // 원래 신청 시 받은 resDate 사용 (YYYYMMDDHHMMSS 형식)
          reqYmd = deliveryInfo.resDate.substring(0, 8);
          console.log('📅 delivery_info.resDate에서 reqYmd 추출:', reqYmd);
        } else if (shipment.pickup_requested_at) {
          reqYmd = new Date(shipment.pickup_requested_at).toISOString().split('T')[0].replace(/-/g, '');
          console.log('📅 pickup_requested_at에서 reqYmd 추출:', reqYmd);
        } else {
          reqYmd = new Date().toISOString().split('T')[0].replace(/-/g, '');
          console.log('📅 현재 날짜로 reqYmd 설정:', reqYmd);
        }

        epostStatus = await getResInfo({
          custNo: Deno.env.get('EPOST_CUSTOMER_ID') || '',
          reqType: '1',
          orderNo: shipment.order_id,
          reqYmd,
        });
        console.log('✅ GetResInfo API 성공:', epostStatus?.treatStusCd);
      } catch (apiError: any) {
        console.error('⚠️ GetResInfo API 실패:', apiError?.message);
        
        // ERR-225 오류는 신청정보 불일치 - 사용자에게 친절한 메시지로 변환
        const errorMessage = apiError?.message || '';
        if (errorMessage.includes('ERR-225') || errorMessage.includes('신청정보가 존재하지 않습니다')) {
          // 웹 스크래핑도 실패하고 API도 실패한 경우
          // → 아직 집하되지 않았거나, 우체국 시스템에 등록되지 않은 상태
          console.log('📋 ERR-225: 아직 우체국 시스템에 등록되지 않은 상태로 판단');
          epostError = null; // 에러 표시하지 않음 (isNotYetPickedUp으로 처리됨)
        } else {
          epostError = {
            message: apiError?.message || '배송 상태를 조회할 수 없습니다',
            code: apiError?.code || 'UNKNOWN_ERROR',
          };
        }
      }
    }

    try {
      console.log('📋 최종 epostStatus:', epostStatus?.treatStusCd);
      
      // 어떤 송장번호로 조회했는지 확인 (수거 vs 배송)
      const isPickupTracking = trackingNo === shipment.pickup_tracking_no;
      const isDeliveryTracking = trackingNo === shipment.delivery_tracking_no;
      
      console.log('📋 송장번호 타입:', { isPickupTracking, isDeliveryTracking, trackingNo });
      
      // 주문 상태 조회
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', shipment.order_id)
        .single();
      
      const currentOrderStatus = currentOrder?.status || '';
      
      // 🚚 수거 송장 + 배송완료(05) = 입고 완료 (BOOKED → INBOUND)
      if (isPickupTracking && epostStatus?.treatStusCd === '05' && currentOrderStatus === 'BOOKED') {
        console.log('📦 수거 완료 감지! 상태를 INBOUND로 업데이트합니다.');
        
        // shipments 테이블 업데이트
        const { error: shipmentUpdateError } = await supabase
          .from('shipments')
          .update({
            status: 'PICKED_UP',
            pickup_completed_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);
        
        if (shipmentUpdateError) {
          console.error('⚠️ shipments 상태 업데이트 실패:', shipmentUpdateError);
        } else {
          console.log('✅ shipments 상태가 PICKED_UP으로 업데이트되었습니다.');
        }
        
        // orders 테이블도 INBOUND로 업데이트
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'INBOUND',
          })
          .eq('id', shipment.order_id);
        
        if (orderUpdateError) {
          console.error('⚠️ orders 상태 업데이트 실패:', orderUpdateError);
        } else {
          console.log('✅ orders 상태가 INBOUND로 업데이트되었습니다.');
        }
        
        // 업데이트된 shipment 정보 다시 조회
        const { data: updatedShipment } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', shipment.id)
          .single();
        
        if (updatedShipment) {
          shipment = updatedShipment;
        }
      }
      
      // 🚚 배송 송장 + 배송완료(05) = 배송 완료 (READY_TO_SHIP → DELIVERED)
      if (isDeliveryTracking && epostStatus?.treatStusCd === '05' && currentOrderStatus === 'READY_TO_SHIP') {
        console.log('📦 배송완료 감지! 상태를 DELIVERED로 업데이트합니다.');
        
        // shipments 테이블 업데이트
        const { error: shipmentUpdateError } = await supabase
          .from('shipments')
          .update({
            status: 'DELIVERED',
            delivery_completed_at: new Date().toISOString(),
          })
          .eq('id', shipment.id);
        
        if (shipmentUpdateError) {
          console.error('⚠️ shipments 상태 업데이트 실패:', shipmentUpdateError);
        } else {
          console.log('✅ shipments 상태가 DELIVERED로 업데이트되었습니다.');
        }
        
        // orders 테이블도 업데이트
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'DELIVERED',
            completed_at: new Date().toISOString(),
          })
          .eq('id', shipment.order_id);
        
        if (orderUpdateError) {
          console.error('⚠️ orders 상태 업데이트 실패:', orderUpdateError);
        } else {
          console.log('✅ orders 상태가 DELIVERED로 업데이트되었습니다.');
        }
        
        // 업데이트된 shipment 정보 다시 조회
        const { data: updatedShipment } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', shipment.id)
          .single();
        
        if (updatedShipment) {
          shipment = updatedShipment;
        }
      }
    } catch (e: any) {
      console.error('⚠️ 상태 업데이트 중 에러:', e?.message || e);
    }

    // 배송 추적 URL 생성
    const trackingUrl = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${trackingNo}`;

    // 종추적조회 이벤트가 있는지 확인
    const hasTrackingEvents = trackingInfo?.success && trackingInfo.events.length > 0;

    // DB에 저장된 이전 추적 이벤트 (live API 실패 시 fallback)
    // BOOKED 등 예약 이벤트는 제외하고 실제 택배 추적 이력만 사용
    const BOOKING_STATUSES = ['BOOKED', 'PENDING', 'CANCELLED', 'CANCELED'];
    const storedTrackingEvents = Array.isArray(shipment.tracking_events)
      ? shipment.tracking_events.filter((e: any) =>
          e?.date && e?.time && // 날짜·시간이 있는 이벤트만 (실제 추적 이력)
          !BOOKING_STATUSES.includes(e?.status)
        )
      : [];
    const useCachedEvents = !hasTrackingEvents && storedTrackingEvents.length > 0;
    if (useCachedEvents) {
      console.log('📦 live 스크래핑 없음 → DB 캐시 이벤트 사용:', storedTrackingEvents.length, '건');
    }
    
    // 응답
    return successResponse({
      tracking_no: trackingNo,
      tracking_url: trackingUrl,
      isCachedEvents: useCachedEvents, // 캐시 데이터 사용 여부
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
        tracking_events: storedTrackingEvents,
      },
      epost: epostStatus ? {
        reqNo: epostStatus.reqNo,
        resNo: epostStatus.resNo,
        regiNo: epostStatus.regiNo || trackingNo,
        regiPoNm: epostStatus.regiPoNm,
        resDate: epostStatus.resDate,
        treatStusCd: epostStatus.treatStusCd,
        treatStusNm: getTreatStatusName(epostStatus.treatStusCd),
        // 종추적조회 추가 정보
        deliveryStatus: epostStatus.deliveryStatus || null,
        senderName: epostStatus.senderName || null,
        receiverName: epostStatus.receiverName || null,
      } : null,
      // 종추적조회 이벤트: live 스크래핑 → DB 캐시 순으로 fallback
      trackingEvents: hasTrackingEvents
        ? trackingInfo!.events.map((event: TrackingEvent) => ({
            date: event.date,
            time: event.time,
            location: event.location,
            status: event.status,
            description: event.description || null,
          }))
        : storedTrackingEvents,
      epostError: epostError || null,
      // 아직 집하 전: live도 없고 캐시도 없고 epost 상태도 없는 경우
      isNotYetPickedUp: !hasTrackingEvents && storedTrackingEvents.length === 0 && epostStatus === null && epostError === null,
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
    '04': '배송중',
    '05': '배송완료',
  };
  return statusMap[code] || '알 수 없음';
}


