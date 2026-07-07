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

export function isPostInboundOrderStatus(status: string | null | undefined): boolean {
  return !!status && POST_INBOUND_ORDER_STATUSES.has(status);
}

export function isReturnWorkflowStatus(status: string | null | undefined): boolean {
  return status === "RETURN_PENDING" || status === "RETURN_SHIPPING";
}

export function canShowReturnShipmentUi(order: {
  status?: string | null;
  extra_charge_status?: string | null;
  extra_charge_data?: { returnTrackingNo?: string } | null;
  tracking_no?: string | null;
}): boolean {
  if (order.extra_charge_data?.returnTrackingNo) return true;
  if (isReturnWorkflowStatus(order.status)) return true;
  if (order.extra_charge_status === "RETURN_REQUESTED") return true;
  if (order.status === "CANCELLED" && order.tracking_no) return true;
  return false;
}

export function buildReturnPendingOrderUpdate(
  existingExtraData: Record<string, unknown> | null | undefined,
  options: {
    reason: string;
    source: "ADMIN_PAYMENT_CANCEL" | "ADMIN_STATUS_CANCEL" | "ADMIN_RETURN_PENDING";
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
