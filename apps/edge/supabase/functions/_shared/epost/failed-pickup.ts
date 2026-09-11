const FAILED_PICKUP_PATTERNS = [
  '송화인부재',
  '송화인 부재',
  '미집하',
  '미수거',
  '수거불가',
  '방문불응',
];

export function isFailedPickupStatus(value?: string | null): boolean {
  const text = String(value ?? '').replace(/\s+/g, '');
  if (!text) return false;
  if (text.includes('수령인부재') && !text.includes('송화인')) return false;
  if (FAILED_PICKUP_PATTERNS.some((p) => text.includes(p.replace(/\s+/g, '')))) {
    return true;
  }
  return text.includes('부재');
}

export function trackingEventsShowFailedPickup(
  events?: Array<{ status?: string | null; description?: string | null }> | null,
): boolean {
  if (!events?.length) return false;
  let bookingIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const status = String(events[i]?.status ?? '').replace(/\s+/g, '');
    const description = String(events[i]?.description ?? '').replace(/\s+/g, '');
    if (status === 'BOOKED' || description.includes('수거예약')) {
      bookingIdx = i;
      break;
    }
  }
  const relevant = bookingIdx >= 0 ? events.slice(bookingIdx + 1) : events;
  return relevant.some(
    (event) => isFailedPickupStatus(event.status) || isFailedPickupStatus(event.description),
  );
}

const REBOOKABLE_ORDER_STATUSES = new Set(['PAID', 'BOOKED']);
const BLOCKED_SHIPMENT_STATUSES = new Set(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);

export function canForceRebookPickup(opts: {
  orderStatus?: string | null;
  canceledAt?: string | null;
  shipmentStatus?: string | null;
  pickupCompletedAt?: string | null;
}): { ok: true } | { ok: false; error: string; code: string } {
  if (opts.canceledAt) {
    return { ok: false, error: '취소된 주문은 재접수할 수 없습니다.', code: 'ORDER_CANCELLED' };
  }
  if (!REBOOKABLE_ORDER_STATUSES.has(String(opts.orderStatus ?? ''))) {
    return { ok: false, error: '수거 전 주문만 재접수할 수 있습니다.', code: 'NOT_REBOOKABLE' };
  }
  if (opts.pickupCompletedAt || BLOCKED_SHIPMENT_STATUSES.has(String(opts.shipmentStatus ?? ''))) {
    return { ok: false, error: '이미 집하된 소포는 재접수할 수 없습니다.', code: 'ALREADY_PICKED_UP' };
  }
  return { ok: true };
}
