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
  const tracking =
    order.tracking_no ||
    order.shipment?.pickup_tracking_no ||
    order.shipment?.tracking_no ||
    "";
  return !tracking;
}
