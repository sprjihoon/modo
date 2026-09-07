export const PICKUP_NOTIFICATION_TYPES = [
  "pickup_today",
  "pickup_reminder",
  "pickup_reminder_d1",
  "pickup_reminder_today",
  "SHIPMENT_BOOKED",
] as const;

export function buildCustomerCancelNotification(params: {
  userId: string;
  orderId: string;
  orderNumber?: string | null;
  refundAmount?: number | null;
  refunded: boolean;
}) {
  const orderLabel = params.orderNumber ?? params.orderId.slice(0, 8);
  const refundText =
    params.refunded && (params.refundAmount ?? 0) > 0
      ? ` 결제하신 ${params.refundAmount!.toLocaleString()}원이 환불 처리됩니다.`
      : "";

  return {
    user_id: params.userId,
    type: "order_cancelled",
    title: "주문 취소 완료",
    body: `주문(${orderLabel})이 취소되었습니다.${refundText}`,
    order_id: params.orderId,
  };
}
