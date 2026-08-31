export type SubPartMode = "all" | "specific";

export interface SubPartLike {
  id: string;
  name: string;
  price: number;
  icon_name?: string;
}

export function normalizeId(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

/** API 행을 선택용 세부부위로 정규화. part_type이 없거나 sub_part인 행만 사용 */
export function mapApiSubParts(rows: unknown): SubPartLike[] {
  if (!Array.isArray(rows)) return [];
  const out: SubPartLike[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const partType = r.part_type;
    if (partType != null && partType !== "sub_part") continue;
    const id = normalizeId(r.id);
    if (!id) continue;
    const priceNum = typeof r.price === "number" ? r.price : Number(r.price);
    out.push({
      id,
      name: typeof r.name === "string" ? r.name : "",
      price: Number.isFinite(priceNum) ? priceNum : 0,
      icon_name: typeof r.icon_name === "string" ? r.icon_name : undefined,
    });
  }
  return out;
}

export function canConfirmSubParts(mode: SubPartMode, selectedCount: number): boolean {
  return mode === "all" || selectedCount > 0;
}

/** 단일 선택 항목은 세부부위 탭 즉시 다음 단계로 */
export function shouldAutoConfirmOnSubPartTap(allowMultiple: boolean): boolean {
  return !allowMultiple;
}

export type SubPartsConfirmResult<T extends SubPartLike> =
  | { kind: "noop" }
  | { kind: "measure-all"; overridePrice: number }
  | { kind: "add-all"; overridePrice: number }
  | { kind: "measure-parts"; parts: T[] }
  | { kind: "add-parts"; parts: T[] };

export function resolveSubPartsConfirm<T extends SubPartLike>(opts: {
  mode: SubPartMode;
  selectedIds: Iterable<unknown>;
  subParts: T[];
  requiresMeasurement: boolean;
  typePrice: number;
  allOptionPrice?: number | null;
}): SubPartsConfirmResult<T> {
  const selected = new Set(
    Array.from(opts.selectedIds, normalizeId).filter(Boolean)
  );

  if (opts.mode === "all") {
    const overridePrice = opts.allOptionPrice ?? opts.typePrice;
    return opts.requiresMeasurement
      ? { kind: "measure-all", overridePrice }
      : { kind: "add-all", overridePrice };
  }

  const parts = opts.subParts.filter((p) => selected.has(normalizeId(p.id)));
  if (parts.length === 0) return { kind: "noop" };
  return opts.requiresMeasurement
    ? { kind: "measure-parts", parts }
    : { kind: "add-parts", parts };
}

export function shouldAutoProceedRepair(opts: {
  repairTypeCount: number;
  selectedCount: number;
  inSubParts: boolean;
  inMeasure: boolean;
  loading?: boolean;
}): boolean {
  return (
    opts.repairTypeCount === 1 &&
    opts.selectedCount > 0 &&
    !opts.inSubParts &&
    !opts.inMeasure &&
    !opts.loading
  );
}
