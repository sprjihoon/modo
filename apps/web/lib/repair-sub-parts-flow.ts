export type SubPartMode = "all" | "specific";

export interface SubPartLike {
  id: string;
  name: string;
  price: number;
  icon_name?: string;
  input_count?: number | null;
  input_labels?: string[] | null;
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
    const inputCount = Number(r.input_count);
    const rawLabels = Array.isArray(r.input_labels)
      ? r.input_labels.map((label) => String(label ?? "").trim()).filter(Boolean)
      : [];
    out.push({
      id,
      name: typeof r.name === "string" ? r.name : "",
      price: Number.isFinite(priceNum) ? priceNum : 0,
      icon_name: typeof r.icon_name === "string" ? r.icon_name : undefined,
      input_count: Number.isFinite(inputCount) && inputCount > 0 ? inputCount : 1,
      input_labels: rawLabels.length > 0 ? rawLabels : null,
    });
  }
  return out;
}

export function canConfirmSubParts(mode: SubPartMode, selectedCount: number): boolean {
  return mode === "all" || selectedCount > 0;
}

/** 전체 라디오가 선택된 경우에만 표시할 전체 옵션 가격 */
export function resolveAllOptionDisplayPrice(opts: {
  selectedMode: SubPartMode;
  allOptionPrice?: number | null;
  typePrice: number;
}): number | null {
  if (opts.selectedMode !== "all") return null;
  const price = opts.allOptionPrice ?? opts.typePrice;
  return price > 0 ? price : null;
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

export function normalizeInputLabels(
  rawLabels: unknown,
  inputCount = 1,
): string[] {
  const count = inputCount > 0 ? inputCount : 1;
  if (Array.isArray(rawLabels)) {
    const labels = rawLabels.map((label) => String(label ?? "").trim()).filter(Boolean);
    if (labels.length >= count) return labels.slice(0, count);
    if (labels.length > 0) {
      return Array.from({ length: count }, (_, i) => labels[i] || `치수 ${i + 1} (cm)`);
    }
  }
  if (typeof rawLabels === "string" && rawLabels.trim()) {
    if (count <= 1) return [rawLabels.trim()];
    const parts = rawLabels
      .split(/(?<=\))\s+(?=\S)/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= count) return parts.slice(0, count);
    return Array.from({ length: count }, (_, i) => `치수 ${i + 1} (cm)`);
  }
  return Array.from({ length: count }, (_, i) =>
    count > 1 ? `치수 ${i + 1} (cm)` : "치수 (cm)",
  );
}

/** 부위에 라벨/2칸이 있으면 그걸 쓰고, 없으면 상위 항목 라벨을 따른다. */
export function resolvePartInputLabels(
  part: { input_count?: number | null; input_labels?: unknown },
  fallback: string[],
): string[] {
  const count = Number(part.input_count) || 0;
  const hasOwnLabels =
    (Array.isArray(part.input_labels) &&
      part.input_labels.some((label) => String(label ?? "").trim())) ||
    (typeof part.input_labels === "string" && part.input_labels.trim().length > 0);
  if (count > 1 || hasOwnLabels) {
    return normalizeInputLabels(part.input_labels, count > 0 ? count : 1);
  }
  return fallback.length > 0 ? fallback : ["치수 (cm)"];
}

export type MeasureFieldGroup = {
  key: string;
  title: string;
  labels: string[];
};

export function buildMeasureFieldGroups(opts: {
  fallbackLabels: string[];
  parts?: Array<{
    id: string;
    name: string;
    input_count?: number | null;
    input_labels?: unknown;
  }>;
}): MeasureFieldGroup[] {
  const fallback =
    opts.fallbackLabels.length > 0 ? opts.fallbackLabels : ["치수 (cm)"];
  if (!opts.parts || opts.parts.length === 0) {
    return [{ key: "_single", title: "", labels: fallback }];
  }
  return opts.parts.map((part) => ({
    key: part.id,
    title: part.name,
    labels: resolvePartInputLabels(part, fallback),
  }));
}

export function measureFieldCount(groups: MeasureFieldGroup[]): number {
  return groups.reduce((sum, group) => sum + group.labels.length, 0);
}

export function detailFromMeasureGroup(
  group: MeasureFieldGroup,
  values: string[],
  offset: number,
): string {
  return group.labels
    .map((label, i) => `${label}: ${values[offset + i]?.trim() || "-"}`)
    .join(", ");
}
