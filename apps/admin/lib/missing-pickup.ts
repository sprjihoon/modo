export function formatOrderDate(value?: string | null): string | null {
  if (!value) return null;
  const ymd = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return String(value);
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export function todayYmdKst(): string {
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return nowKst.toISOString().slice(0, 10);
}

export function isPastOrderDate(value?: string | null): boolean {
  const ymd = value ? String(value).slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return ymd < todayYmdKst();
}

export function isPickupBookingLock(value?: string | null): boolean {
  return !!value && String(value).startsWith("LOCK:");
}

export function isRealTrackingNo(value?: string | null): boolean {
  return !!value && !isPickupBookingLock(value);
}

export function isMissingPickupWaybill(order: {
  status?: string | null;
  payment_status?: string | null;
  tracking_no?: string | null;
  canceled_at?: string | null;
  shipment?: { pickup_tracking_no?: string | null; tracking_no?: string | null } | null;
}): boolean {
  if (order.canceled_at) return false;
  if (order.status !== "PAID") return false;
  if (order.payment_status && order.payment_status !== "PAID") return false;
  if (isPickupBookingLock(order.tracking_no)) return false;
  const tracking =
    order.tracking_no ||
    order.shipment?.pickup_tracking_no ||
    order.shipment?.tracking_no ||
    "";
  return !isRealTrackingNo(tracking);
}
