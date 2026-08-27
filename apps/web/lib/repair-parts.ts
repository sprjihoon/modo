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

function asDetail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** 옛 앱 detailedMeasurements → 표시용 수치 */
export function detailFromDetailedMeasurements(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const lines: string[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const part = String(row.part ?? "").trim();
    if (Array.isArray(row.values) && row.values.length > 0) {
      const bits = row.values
        .map((v) => {
          if (v && typeof v === "object") {
            const item = v as Record<string, unknown>;
            const label = String(item.label ?? "").trim();
            const value = String(item.value ?? "").trim();
            if (!value) return "";
            return label ? `${label}: ${value}` : value;
          }
          return String(v ?? "").trim();
        })
        .filter(Boolean)
        .join(", ");
      if (!bits) continue;
      lines.push(part ? `${part} (${bits})` : bits);
      continue;
    }
    const value = String(row.value ?? "").trim();
    if (!value) continue;
    lines.push(part ? `${part}: ${value}` : value);
  }
  return lines.length > 0 ? lines.join(" / ") : undefined;
}

/**
 * 수선 형태와 무관하게 고객 수치를 꺼낸다.
 * 신규 `detail` → 옛 detailedMeasurements → scope/measurement/selectedParts
 */
export function repairItemDetail(item: Record<string, unknown>): string | undefined {
  const existing = asDetail(item.detail);
  if (existing) return existing;

  const fromDetailed = detailFromDetailedMeasurements(item.detailedMeasurements);
  if (fromDetailed) return fromDetailed;

  const parts: string[] = [];
  const scope = String(item.scope ?? "").trim();
  const measurement = String(item.measurement ?? "").trim();
  if (scope) parts.push(scope);
  if (measurement && measurement !== "{}") parts.push(measurement);
  const selected = Array.isArray(item.selectedParts) ? item.selectedParts : [];
  if (selected.length > 0) parts.push(`부위: ${selected.join(", ")}`);
  return parts.length > 0 ? parts.join(" / ") : undefined;
}

/** 견적·repair_parts 에 넣는 정규 항목. detail 이 빠지면 작업지시서에 수치가 안 나온다. */
export function toQuoteRepairItem(item: Record<string, unknown>): ParsedRepairPart {
  const name = String(item.repairPart ?? item.name ?? "수선").trim() || "수선";
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;
  const detail = repairItemDetail(item);
  return {
    name,
    price,
    quantity: quantity < 1 ? 1 : quantity,
    ...(detail ? { detail } : {}),
  };
}

export function parseRepairPart(raw: unknown): ParsedRepairPart {
  if (raw == null) return { name: "", price: 0, quantity: 1 };
  if (typeof raw === "object") {
    return toQuoteRepairItem(raw as Record<string, unknown>);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("{")) {
      try {
        return parseRepairPart(JSON.parse(s));
      } catch {
        return { name: s, price: 0, quantity: 1 };
      }
    }
    return { name: s, price: 0, quantity: 1 };
  }
  return { name: String(raw), price: 0, quantity: 1 };
}

/** 작업지시서·주문 상세에 표시할 고객 입력 수치만 추출 */
export function measurementLinesFromParts(
  parts?: unknown[] | null
): Array<{ name: string; detail: string }> {
  if (!Array.isArray(parts) || parts.length === 0) return [];
  return parts
    .map((raw) => {
      const p = parseRepairPart(raw);
      return p.detail ? { name: p.name || "수선", detail: p.detail } : null;
    })
    .filter((x): x is { name: string; detail: string } => !!x);
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
