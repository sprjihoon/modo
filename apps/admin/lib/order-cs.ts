export const CS_COMPENSATION_CAP = 200_000;

export type CsAction = "REWORK" | "REPAIR_REFUND" | "COMPENSATION" | "PAYMENT_REFUND";
export type CsStatus = "REWORK" | "REPAIR_REFUNDED" | "COMPENSATED" | null;

export function repairFeeOf(order: {
  base_price?: number | null;
  total_price?: number | null;
  shipping_fee?: number | null;
  remote_area_fee?: number | null;
}): number {
  const base = Number(order.base_price ?? 0);
  if (base > 0) return Math.round(base);
  const total = Number(order.total_price ?? 0);
  const shipping = Number(order.shipping_fee ?? 0);
  const remote = Number(order.remote_area_fee ?? 0);
  return Math.max(0, Math.round(total - shipping - remote));
}

export function compensationAmount(residualValue: number, repairFee: number): number {
  const residual = Math.max(0, Math.round(residualValue));
  const fiveX = Math.max(0, repairFee) * 5;
  return Math.min(residual, fiveX, CS_COMPENSATION_CAP);
}

function jsonText(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

export function snapshotShipment(shipment: Record<string, unknown> | null | undefined) {
  if (!shipment) return null;
  return {
    pickup_tracking_no: jsonText(shipment.pickup_tracking_no ?? shipment.tracking_no),
    delivery_tracking_no: jsonText(shipment.delivery_tracking_no),
    pickup_scheduled_date: jsonText(shipment.pickup_scheduled_date),
    status: jsonText(shipment.status),
  };
}

export const WORKSHOP_STATUSES = new Set([
  "INBOUND",
  "PROCESSING",
  "HOLD",
  "READY_TO_SHIP",
  "OUT_FOR_DELIVERY",
]);

export const CLOSED_CS_STATUSES = new Set(["REPAIR_REFUNDED", "COMPENSATED"]);
