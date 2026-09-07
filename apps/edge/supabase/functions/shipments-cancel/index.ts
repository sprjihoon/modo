/**
 * 소포신청 취소 API
 * POST /shipments-cancel
 * 
 * 우체국 소포신청을 취소하고 DB 업데이트
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { cancelOrder, resolveCancelReqYmds, isEpostNoReservationError } from '../_shared/epost/index.ts';

interface ShipmentCancelRequest {
  order_id: string;
  delete_after_cancel?: boolean; // 취소 후 삭제 여부 (기본값: true = 완전 삭제, false = 취소만 하고 새 송장번호 발급)
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
    const { order_id, delete_after_cancel = true } = body; // 기본값: true (완전 삭제)

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

    const deliveryInfo = (shipment.delivery_info as Record<string, unknown> | null) || {};
    const reqYmdCandidates = resolveCancelReqYmds({
      storedReqYmd: typeof firstEvent.reqYmd === 'string' ? firstEvent.reqYmd : undefined,
      resDate: typeof deliveryInfo.resDate === 'string' ? deliveryInfo.resDate : undefined,
      reqNo,
      pickupRequestedAt: shipment.pickup_requested_at,
      createdAt: shipment.created_at,
    });

    console.log('📅 신청일자 후보(reqYmd):', reqYmdCandidates);

    // 우체국 API 취소 호출
    // ⚠️ 중요: reqType과 payType은 수거 신청 시 사용한 값과 동일해야 함
    // 수거지시는 reqType='2' (반품소포), payType='2' (착불)로 신청되므로
    // 취소 시에도 동일한 값을 사용해야 함
    const regiNo = shipment.pickup_tracking_no || shipment.tracking_no;
    let cancelResult;
    let lastNoReservationError = '';

    for (const reqYmd of reqYmdCandidates) {
      try {
        cancelResult = await cancelOrder({
          custNo,
          apprNo,
          reqType,
          payType,
          reqNo,
          resNo,
          regiNo,
          reqYmd,
          delYn: delete_after_cancel ? 'Y' : 'N',
        });
        lastNoReservationError = '';
        console.log('📥 우체국 취소 응답:', { reqYmd, ...cancelResult });
        break;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('❌ 우체국 취소 실패:', { reqYmd, message });

        if (isEpostNoReservationError(message)) {
          lastNoReservationError = message;
          continue;
        }

        return errorResponse(
          `우체국 전산 취소 실패: ${message || '알 수 없는 오류'}`,
          500,
          'EPOST_CANCEL_FAILED'
        );
      }
    }

    if (lastNoReservationError) {
      return errorResponse(
        `우체국에서 수거 예약을 찾지 못했습니다. 송장 ${regiNo} 접수가 남아 있을 수 있습니다.`,
        500,
        'EPOST_CANCEL_FAILED'
      );
    }

    const isSuccess = cancelResult?.canceledYn === 'Y' || cancelResult?.canceledYn === 'D';
    if (!cancelResult || !isSuccess) {
      const reason = cancelResult?.notCancelReason || `canceledYn=${cancelResult?.canceledYn ?? '없음'}`;
      return errorResponse(
        `우체국 수거 접수가 취소되지 않았습니다. (${reason})`,
        500,
        'EPOST_CANCEL_FAILED'
      );
    }

    if (delete_after_cancel && cancelResult.regiNo) {
      console.warn('⚠️ delYn=Y인데 새 송장번호가 발급되었습니다:', cancelResult.regiNo);
    }

    const pickupNotificationTypes = [
      'pickup_today',
      'pickup_reminder',
      'pickup_reminder_d1',
      'pickup_reminder_today',
      'SHIPMENT_BOOKED',
    ];

    const { error: shipmentUpdateError } = await supabase
      .from('shipments')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

    if (shipmentUpdateError) {
      console.error('❌ shipments CANCELLED 업데이트 실패, 삭제로 폴백:', shipmentUpdateError);
      const { error: shipmentDeleteError } = await supabase
        .from('shipments')
        .delete()
        .eq('order_id', order_id);
      if (shipmentDeleteError) {
        return errorResponse(
          `우체국 취소는 됐지만 송장 상태 갱신에 실패했습니다: ${shipmentDeleteError.message}`,
          500,
          'SHIPMENT_UPDATE_FAILED'
        );
      }
    }

    const { error: pickupNotifError } = await supabase
      .from('notifications')
      .delete()
      .eq('order_id', order_id)
      .in('type', pickupNotificationTypes);
    if (pickupNotifError) {
      console.error('❌ 수거 알림 삭제 실패:', pickupNotifError);
    }

    // orders 테이블도 업데이트
    // payment_status는 결제 취소 API에서 갱신. 여기서는 주문 취소 표시만 맞춤.
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        tracking_no: null,
        canceled_at: new Date().toISOString(),
      })
      .eq('id', order_id);
    if (orderUpdateError) {
      console.error('❌ orders 취소 상태 업데이트 실패:', orderUpdateError);
    }

    // 성공 응답
    const actuallyDeleted = cancelResult?.canceledYn === 'D' || delete_after_cancel;
    return successResponse({
      order_id,
      cancelled: true,
      deleted: actuallyDeleted,
      message: actuallyDeleted
        ? '수거예약이 취소되고 완전 삭제되었습니다 (새 송장 발급 안 됨)' 
        : '수거예약이 취소되었습니다 (새 송장 발급됨)',
      epost_result: cancelResult || null,
    });

  } catch (error) {
    console.error('Shipments cancel error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});


