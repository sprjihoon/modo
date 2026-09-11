import { cancelOrder, getResInfo } from './order.ts';
import { isEpostNoReservationError, resolveCancelReqYmds } from './dates.ts';
import { extractPickupBookingFields, isMissingReqNoError } from './booking-fields.ts';

export type CancelReservationResult =
  | { ok: true; missing: boolean }
  | { ok: false; blocked: boolean; error: string };

function isAlreadyGoneMessage(message?: string): boolean {
  if (!message) return false;
  if (isEpostNoReservationError(message)) return true;
  if (isMissingReqNoError(message)) return true;
  return (
    message.includes('이미 취소') ||
    message.includes('취소된') ||
    message.includes('삭제') ||
    message.includes('미집하') ||
    message.includes('부재') ||
    message.includes('접수정보로 예약된 정보가 없')
  );
}

/**
 * 주문/결제는 유지한 채 우체국 수거예약만 취소한다.
 * 예약이 이미 없거나 신청번호(reqNo)를 잃었으면 missing=true 로 성공 처리한다.
 */
export async function cancelExistingPickupReservation(shipment: {
  order_id?: string | null;
  order_no?: string | null;
  pickup_tracking_no?: string | null;
  tracking_no?: string | null;
  tracking_events?: unknown;
  delivery_info?: unknown;
  pickup_requested_at?: string | null;
  created_at?: string | null;
  status?: string | null;
} | null): Promise<CancelReservationResult> {
  if (!shipment) return { ok: true, missing: true };

  if (shipment.status === 'PICKED_UP' || shipment.status === 'IN_TRANSIT') {
    return { ok: false, blocked: true, error: '이미 집하완료된 소포는 재접수할 수 없습니다.' };
  }

  const booking = extractPickupBookingFields(shipment.tracking_events, shipment.delivery_info);
  let reqNo = booking.reqNo;
  let resNo = booking.resNo;
  const apprNo = booking.apprNo || Deno.env.get('EPOST_APPROVAL_NO') || '0000000000';
  const reqType = booking.reqType;
  const payType = booking.payType;
  const regiNo = String(shipment.pickup_tracking_no || shipment.tracking_no || '');
  const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';
  const deliveryInfo = (shipment.delivery_info as Record<string, unknown> | null) || {};

  const reqYmdCandidates = resolveCancelReqYmds({
    storedReqYmd: booking.reqYmd,
    resDate: typeof deliveryInfo.resDate === 'string' ? deliveryInfo.resDate : undefined,
    reqNo,
    pickupRequestedAt: shipment.pickup_requested_at || undefined,
    createdAt: shipment.created_at || undefined,
  });

  const epostOrderNo = shipment.order_no || shipment.order_id || '';
  if (!reqNo && epostOrderNo) {
    for (const reqYmd of reqYmdCandidates) {
      try {
        const info = await getResInfo({
          custNo,
          reqType,
          orderNo: epostOrderNo,
          reqYmd,
        });
        if (info?.reqNo) {
          reqNo = info.reqNo;
          resNo = info.resNo || resNo;
          console.log('✅ GetResInfo 로 reqNo 복구:', reqNo);
          break;
        }
      } catch (e) {
        console.warn('⚠️ 재접수 전 GetResInfo 실패:', e instanceof Error ? e.message : e);
      }
    }
  }

  if (!regiNo && !reqNo) {
    console.warn('⚠️ 재접수: 취소할 신청번호가 없어 우체국 취소를 건너뜁니다.');
    return { ok: true, missing: true };
  }

  if (!reqNo) {
    console.warn('⚠️ 재접수: reqNo 가 없어 우체국 취소를 건너뛰고 새 접수를 진행합니다.', { regiNo });
    return { ok: true, missing: true };
  }

  let lastNoReservationError = '';
  let lastError = '';

  for (const reqYmd of reqYmdCandidates) {
    try {
      const cancelResult = await cancelOrder({
        custNo,
        apprNo,
        reqType,
        payType,
        reqNo,
        resNo,
        regiNo,
        reqYmd,
        delYn: 'Y',
      });
      const isSuccess = cancelResult?.canceledYn === 'Y' || cancelResult?.canceledYn === 'D';
      if (isSuccess) {
        console.log('✅ 재접수 전 우체국 취소 완료:', { reqYmd, canceledYn: cancelResult.canceledYn });
        return { ok: true, missing: false };
      }
      const reason = cancelResult?.notCancelReason || `canceledYn=${cancelResult?.canceledYn ?? '없음'}`;
      if (isAlreadyGoneMessage(reason)) {
        return { ok: true, missing: true };
      }
      if (reason.includes('집하') || reason.includes('발송') || reason.includes('배달')) {
        return { ok: false, blocked: true, error: `이미 집하된 소포는 재접수할 수 없습니다. (${reason})` };
      }
      lastError = reason;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('❌ 재접수 전 우체국 취소 실패:', { reqYmd, message });
      if (isAlreadyGoneMessage(message)) {
        lastNoReservationError = message;
        continue;
      }
      lastError = message;
    }
  }

  if (lastNoReservationError || isMissingReqNoError(lastError)) {
    return { ok: true, missing: true };
  }
  if (lastError) {
    return { ok: false, blocked: false, error: `기존 수거예약을 취소하지 못했습니다. (${lastError})` };
  }
  return { ok: true, missing: true };
}
