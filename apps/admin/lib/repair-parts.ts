/**
 * repair_parts 배열 파싱 및 항목별 가격 계산 유틸
 *
 * orders.repair_parts 는 string[] 로 저장되며,
 * 각 element 는 JSON 문자열 { name, price, quantity, detail? } 이거나
 * 평문 문자열(레거시) 일 수 있다.
 */

export interface ParsedRepairPart {
  name: string;
  price: number;
  quantity: number;
  detail?: string;
}

export function parseRepairPart(raw: string): ParsedRepairPart {
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? "",
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 1,
      detail: p.detail,
    };
  } catch {
    return { name: raw, price: 0, quantity: 1 };
  }
}

export function itemPrice(part: ParsedRepairPart): number {
  return part.price * part.quantity;
}

/**
 * 취소할 항목들의 환불 금액 계산.
 *
 * @param repairParts  orders.repair_parts (string[])
 * @param alreadyCanceled  이미 취소된 인덱스 (orders.canceled_repair_parts)
 * @param newCancelIndices  이번에 취소할 인덱스
 * @param totalPrice  주문 총 결제금액
 * @param shippingFee  배송비 (배송비가 별도 저장된 경우)
 * @param remoteAreaFee  도서산간 추가비
 * @returns { cancelAmount, remainingActiveItems, isFullCancel }
 */
export function calcItemCancelAmount(opts: {
  repairParts: string[];
  alreadyCanceled: number[];
  newCancelIndices: number[];
  totalPrice: number;
  shippingFee: number;
  remoteAreaFee: number;
}): {
  cancelAmount: number;
  remainingItemsTotal: number;
  isFullCancel: boolean;
  parsedParts: ParsedRepairPart[];
} {
  const { repairParts, alreadyCanceled, newCancelIndices, totalPrice, shippingFee, remoteAreaFee } = opts;

  const parsed = repairParts.map(parseRepairPart);

  const alreadySet = new Set(alreadyCanceled);
  const newSet = new Set(newCancelIndices);
  const allCanceledAfter = new Set([...alreadySet, ...newSet]);

  // 취소할 항목들의 가격 합계
  const cancelItemsTotal = newCancelIndices.reduce(
    (sum, idx) => sum + (parsed[idx] ? itemPrice(parsed[idx]) : 0),
    0
  );

  // 취소 후 남은 활성 항목들의 가격 합계
  const remainingItemsTotal = parsed.reduce(
    (sum, part, idx) => (allCanceledAfter.has(idx) ? sum : sum + itemPrice(part)),
    0
  );

  // 모든 항목이 취소되는지 여부
  const isFullCancel = remainingItemsTotal === 0;

  // 전체 취소이면 배송비도 포함해서 환불
  const cancelAmount = isFullCancel
    ? totalPrice - alreadyCanceled.reduce(
        (sum, idx) => sum + (parsed[idx] ? itemPrice(parsed[idx]) : 0),
        0
      ) // 이미 환불된 항목 제외한 전체 잔액
    : cancelItemsTotal; // 항목 가격만 환불

  return { cancelAmount, remainingItemsTotal, isFullCancel, parsedParts: parsed };
}
