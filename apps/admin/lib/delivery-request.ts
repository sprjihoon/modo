/** 우체국 소포신청 delivMsg 최대 길이 */
export const EPOST_DELIV_MSG_MAX = 200;

export const DEFAULT_OUTBOUND_DELIV_MSG = "수선 완료품입니다. 확인 부탁드립니다.";

/** 고객 배송요청사항(orders.notes). 없으면 fallback, 우체국 한도를 넘으면 자른다. */
export function resolveDeliveryRequestMessage(
  notes?: string | null,
  fallback = ""
): string {
  const trimmed = String(notes ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.length > EPOST_DELIV_MSG_MAX
    ? trimmed.slice(0, EPOST_DELIV_MSG_MAX)
    : trimmed;
}

export type DeliveryRequestOrder = {
  notes?: string | null;
  customer_memo?: string | null;
};

/**
 * 출고송장에 찍히는 배송요청사항.
 * 해당 주문의 notes만 쓰고, 수선 메모(customer_memo)는 넣지 않는다.
 */
export function printedDeliveryRequestForOrder(
  order: DeliveryRequestOrder | null | undefined
): string {
  return resolveDeliveryRequestMessage(order?.notes);
}
