export type PickupBookingFields = {
  reqNo: string;
  resNo: string;
  apprNo: string;
  reqType: '1' | '2';
  payType: '1' | '2';
  reqYmd?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

export function isPickupBookingEvent(event: unknown): boolean {
  const rec = asRecord(event);
  const status = str(rec.status);
  const description = str(rec.description);
  return status === 'BOOKED' || description.includes('수거예약');
}

export function latestPickupBookingIndex(events: unknown): number {
  if (!Array.isArray(events)) return -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isPickupBookingEvent(events[i])) return i;
  }
  return -1;
}

export function extractPickupBookingFields(
  trackingEvents: unknown,
  deliveryInfo?: unknown,
): PickupBookingFields {
  const events = Array.isArray(trackingEvents) ? trackingEvents : [];
  let booked: unknown;
  for (let i = events.length - 1; i >= 0; i--) {
    if (str(asRecord(events[i]).reqNo)) {
      booked = events[i];
      break;
    }
  }
  const fromEvent = asRecord(booked);
  const fromInfo = asRecord(deliveryInfo);

  const reqNo = str(fromEvent.reqNo || fromInfo.reqNo);
  const resNo = str(fromEvent.resNo || fromInfo.resNo);
  const apprNo = str(fromEvent.apprNo || fromInfo.apprNo);
  const reqType = (str(fromEvent.reqType || fromInfo.reqType) === '1' ? '1' : '2') as '1' | '2';
  const payType = (str(fromEvent.payType || fromInfo.payType) === '1' ? '1' : '2') as '1' | '2';
  const reqYmd = str(fromEvent.reqYmd || fromInfo.reqYmd) || undefined;

  return { reqNo, resNo, apprNo, reqType, payType, reqYmd };
}

export function appendPickupRebookEvent(
  existingEvents: unknown,
  bookedEvent: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const prior = Array.isArray(existingEvents)
    ? existingEvents.filter((event) => event && typeof event === 'object') as Array<Record<string, unknown>>
    : [];
  return [...prior, bookedEvent];
}

export function mergeTrackingEventsWithBooking(
  existingEvents: unknown,
  liveEvents: Array<Record<string, unknown>>,
  deliveryInfo?: unknown,
): Array<Record<string, unknown>> {
  const events = Array.isArray(existingEvents)
    ? existingEvents.filter((event) => event && typeof event === 'object') as Array<Record<string, unknown>>
    : [];
  const bookingIdx = latestPickupBookingIndex(events);
  if (bookingIdx >= 0) {
    return [...events.slice(0, bookingIdx), events[bookingIdx], ...liveEvents];
  }

  const booking = extractPickupBookingFields(existingEvents, deliveryInfo);
  if (!booking.reqNo) return liveEvents;
  const already = liveEvents.some((event) => str(event.reqNo) === booking.reqNo);
  if (already) return liveEvents;
  return [
    {
      timestamp: new Date().toISOString(),
      status: 'BOOKED',
      description: '수거예약 정보',
      reqNo: booking.reqNo,
      resNo: booking.resNo,
      apprNo: booking.apprNo,
      reqType: booking.reqType,
      payType: booking.payType,
      reqYmd: booking.reqYmd,
    },
    ...liveEvents,
  ];
}

export function isMissingReqNoError(message?: string): boolean {
  if (!message) return false;
  return (
    message.includes('reqNo') ||
    message.includes('우체국택배신청번호') ||
    message.includes('필수항목누락-우체국택배신청번호')
  );
}
