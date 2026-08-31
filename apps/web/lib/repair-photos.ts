import { parseRepairPart } from "./repair-parts";

export type RepairPhotoMediaRow = {
  type: string;
  path?: string | null;
  provider?: string | null;
  sequence?: number | null;
};

export type RepairPhotoItem = {
  sequence: number;
  label: string;
  before?: string;
  after?: string;
};

/** 입고·출고 사진이 붙는 조회 키. 송장번호와 주문 ID를 모두 넣는다. */
export function collectCustomerPhotoLookupKeys(
  ...values: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    keys.push(value);
  }
  return keys;
}

export function buildRepairPhotoUrl(
  path: string,
  provider: string,
  supabaseUrl: string,
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (provider === "supabase") {
    return `${supabaseUrl}/storage/v1/object/public/repair-photos/${path}`;
  }
  return undefined;
}

export function repairPartLabels(repairParts: unknown): string[] {
  if (!Array.isArray(repairParts)) return [];
  return repairParts
    .map((part) => parseRepairPart(part).name.trim())
    .filter(Boolean);
}

/**
 * media 행 + repair_parts → 고객 주문상세에 그리는 전후 사진 목록.
 * sequence 로 묶고, 라벨은 repair_parts[sequence - 1] 이다.
 */
export function buildRepairPhotoItems(args: {
  photos: RepairPhotoMediaRow[];
  repairParts: unknown;
  supabaseUrl?: string;
}): RepairPhotoItem[] {
  const labels = repairPartLabels(args.repairParts);
  const supabaseUrl = args.supabaseUrl ?? "";
  const bySeq: Record<number, { before?: string; after?: string }> = {};

  for (const photo of args.photos) {
    const seq = photo.sequence ?? 1;
    const url = buildRepairPhotoUrl(
      photo.path ?? "",
      photo.provider ?? "",
      supabaseUrl,
    );
    if (!url) continue;
    bySeq[seq] = bySeq[seq] ?? {};
    if (photo.type === "before_photo") bySeq[seq].before = url;
    else if (photo.type === "after_photo") bySeq[seq].after = url;
  }

  return Object.keys(bySeq)
    .map(Number)
    .sort((a, b) => a - b)
    .map((seq) => ({
      sequence: seq,
      label: labels[seq - 1] || `수선 항목 ${seq}`,
      before: bySeq[seq].before,
      after: bySeq[seq].after,
    }));
}
