/** 입고 이후 센터에 물건이 있는 상태 — 취소 시 반송 송장 필수 */
export const POST_INBOUND_ORDER_STATUSES = new Set([
  "PICKED_UP",
  "INBOUND",
  "PROCESSING",
  "HOLD",
  "READY_TO_SHIP",
]);

/** shipments 기준 입고 완료 여부 */
export const POST_INBOUND_SHIPMENT_STATUSES = new Set([
  "PICKED_UP",
  "INBOUND",
  "PROCESSING",
  "HOLD",
  "READY_TO_SHIP",
  "OUT_FOR_DELIVERY",
]);

/** 수거 전 취소만 주문 종료. 입고 후는 RETURN_DONE 까지 */
export const CLOSED_ORDER_STATUSES = new Set([
  "CANCELLED",
  "DELIVERED",
  "RETURN_DONE",
]);

export type OrderShipmentSnapshot = {
  status?: string | null;
  inbound_at?: string | null;
  pickup_tracking_no?: string | null;
} | null;

export type OrderReturnContext = {
  status?: string | null;
  extra_charge_status?: string | null;
  extra_charge_data?: { returnTrackingNo?: string } | null;
  tracking_no?: string | null;
  shipment?: OrderShipmentSnapshot;
  canceled_at?: string | null;
};

export function isPostInboundOrderStatus(status: string | null | undefined): boolean {
  return !!status && POST_INBOUND_ORDER_STATUSES.has(status);
}

export function wasInboundFromShipment(shipment: OrderShipmentSnapshot): boolean {
  if (!shipment) return false;
  if (shipment.inbound_at) return true;
  return !!shipment.status && POST_INBOUND_SHIPMENT_STATUSES.has(shipment.status);
}

/** 입고(또는 그 이후)에 물건이 센터에 있었는지 */
export function wasInboundOrder(order: OrderReturnContext): boolean {
  if (isPostInboundOrderStatus(order.status)) return true;
  if (order.tracking_no || order.shipment?.pickup_tracking_no) {
    return wasInboundFromShipment(order.shipment ?? null);
  }
  return wasInboundFromShipment(order.shipment ?? null);
}

export function isReturnWorkflowStatus(status: string | null | undefined): boolean {
  return status === "RETURN_PENDING" || status === "RETURN_SHIPPING";
}

/** 입고 후 취소·반송 흐름에 있는지 (아직 RETURN_DONE 전) */
export function isActiveReturnFlow(order: OrderReturnContext): boolean {
  if (order.status === "RETURN_DONE") return false;
  if (isReturnWorkflowStatus(order.status)) return true;
  if (order.extra_charge_status === "RETURN_REQUESTED") return true;
  if (order.status === "CANCELLED" && wasInboundOrder(order)) return true;
  return false;
}

/** 주문이 완전히 종료됐는지 */
export function isOrderFullyClosed(order: OrderReturnContext): boolean {
  if (order.status === "RETURN_DONE" || order.status === "DELIVERED") return true;
  if (order.status === "CANCELLED" && !wasInboundOrder(order)) return true;
  return false;
}

export function canShowReturnShipmentUi(order: OrderReturnContext): boolean {
  if (order.extra_charge_data?.returnTrackingNo) return true;
  if (isReturnWorkflowStatus(order.status)) return true;
  if (order.extra_charge_status === "RETURN_REQUESTED") return true;
  if (order.status === "CANCELLED" && wasInboundOrder(order)) return true;
  return false;
}

/** UI/타임라인용 — 입고 후 CANCELLED 는 반송 대기로 표시 */
export function getEffectiveOrderStatus(order: OrderReturnContext): string {
  if (order.status === "CANCELLED" && wasInboundOrder(order)) {
    if (order.extra_charge_data?.returnTrackingNo) return "RETURN_SHIPPING";
    return "RETURN_PENDING";
  }
  return order.status ?? "UNKNOWN";
}

export function buildReturnPendingOrderUpdate(
  existingExtraData: Record<string, unknown> | null | undefined,
  options: {
    reason: string;
    source: "ADMIN_PAYMENT_CANCEL" | "ADMIN_STATUS_CANCEL" | "ADMIN_RETURN_PENDING" | "WEBHOOK_PAYMENT_CANCEL";
    returnFee?: number;
  }
) {
  const now = new Date().toISOString();
  return {
    status: "RETURN_PENDING" as const,
    extra_charge_status: "RETURN_REQUESTED" as const,
    extra_charge_data: {
      ...(existingExtraData ?? {}),
      customerAction: options.source,
      requiresReturn: true,
      cancelRequestedAt: now,
      cancelReason: options.reason,
      ...(options.returnFee != null ? { returnFee: options.returnFee } : {}),
    },
    canceled_at: now,
    cancellation_reason: options.reason,
  };
}

export function buildPrePickupCancelUpdate(reason: string) {
  return {
    status: "CANCELLED" as const,
    canceled_at: new Date().toISOString(),
    cancellation_reason: reason,
  };
}
