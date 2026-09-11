export const REBOOKABLE_ORDER_STATUSES = new Set(["PAID", "BOOKED"]);

const BLOCKED_SHIPMENT_STATUSES = new Set([
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
]);

const FAILED_PICKUP_PATTERNS = [
  "송화인부재",
  "송화인 부재",
  "미집하",
  "미수거",
  "수거불가",
  "방문불응",
];

export function normalizeStatusText(value?: string | null): string {
  return String(value ?? "").replace(/\s+/g, "");
}

export function isFailedPickupStatus(value?: string | null): boolean {
  const text = normalizeStatusText(value);
  if (!text) return false;
  if (text.includes("수령인부재") && !text.includes("송화인")) return false;
  if (FAILED_PICKUP_PATTERNS.some((p) => text.includes(p.replace(/\s+/g, "")))) {
    return true;
  }
  return text.includes("부재");
}

export function isPickupBookingEvent(event?: { status?: string | null; description?: string | null } | null): boolean {
  const status = normalizeStatusText(event?.status);
  const description = normalizeStatusText(event?.description);
  return status === "BOOKED" || description.includes("수거예약");
}

export function trackingEventsShowFailedPickup(
  events?: Array<{ status?: string | null; description?: string | null }> | null
): boolean {
  if (!events?.length) return false;
  let bookingIdx = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isPickupBookingEvent(events[i])) {
      bookingIdx = i;
      break;
    }
  }
  const relevant = bookingIdx >= 0 ? events.slice(bookingIdx + 1) : events;
  return relevant.some(
    (event) => isFailedPickupStatus(event.status) || isFailedPickupStatus(event.description)
  );
}

export function canRebookPickup(order: {
  status?: string | null;
  canceled_at?: string | null;
  pickup_completed?: boolean;
  shipmentStatus?: string | null;
  pickupCompletedAt?: string | null;
}): boolean {
  if (order.canceled_at) return false;
  if (!REBOOKABLE_ORDER_STATUSES.has(String(order.status ?? ""))) return false;
  if (order.pickup_completed) return false;
  if (order.pickupCompletedAt) return false;
  if (BLOCKED_SHIPMENT_STATUSES.has(String(order.shipmentStatus ?? ""))) return false;
  return true;
}

export function shouldOfferCustomerRebook(opts: {
  status?: string | null;
  canceled_at?: string | null;
  pickupDate?: string | null;
  scheduledDate?: string | null;
  pickupCompletedAt?: string | null;
  shipmentStatus?: string | null;
  trackingEvents?: Array<{ status?: string | null; description?: string | null }> | null;
  todayYmd?: string;
}): boolean {
  if (!canRebookPickup(opts)) return false;
  return trackingEventsShowFailedPickup(opts.trackingEvents);
}

const KR_HOLIDAYS = new Set([
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18",
  "2026-03-01", "2026-03-02",
  "2026-05-05", "2026-05-24", "2026-05-25",
  "2026-06-06",
  "2026-08-15", "2026-08-16", "2026-08-17",
  "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-28",
  "2026-10-03", "2026-10-05",
  "2026-10-09", "2026-12-25",
]);

export function isUnavailablePickupDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return true;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return true;
  return KR_HOLIDAYS.has(ymd);
}

export function nextAvailablePickupDate(fromYmd?: string): string {
  const start = fromYmd && /^\d{4}-\d{2}-\d{2}$/.test(fromYmd)
    ? fromYmd
    : new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 1);
  for (let i = 0; i < 21; i++) {
    const ymd = date.toISOString().slice(0, 10);
    if (!isUnavailablePickupDate(ymd)) return ymd;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}
