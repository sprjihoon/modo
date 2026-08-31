import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * repair_parts 배열 항목을 사람이 읽을 수 있는 문자열로 정규화
 */
export function normalizeRepairPart(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("{")) {
      try {
        const obj = JSON.parse(s) as { name?: string; quantity?: number; detail?: string };
        const qty = (obj.quantity ?? 1) > 1 ? ` ×${obj.quantity}` : "";
        return `${obj.name ?? s}${qty}${obj.detail ? ` (${obj.detail})` : ""}`;
      } catch {
        return s;
      }
    }
    return s;
  }
  if (typeof raw === "object") {
    const obj = raw as { name?: string; quantity?: number; detail?: string };
    const qty = (obj.quantity ?? 1) > 1 ? ` ×${obj.quantity}` : "";
    return `${obj.name ?? ""}${qty}${obj.detail ? ` (${obj.detail})` : ""}`;
  }
  return String(raw);
}

/**
 * 바코드 번호 생성: {trackingNo}-{seq:02d}
 * 예: 123456789012-01
 * trackingNo가 없으면 orderNumber 사용 (fallback)
 */
export function buildBarcodeNo(trackingNoOrOrderNumber: string, seq: number): string {
  return `${trackingNoOrOrderNumber}-${String(seq).padStart(2, "0")}`;
}

/**
 * 주문의 수선 아이템(=바코드) 개수 단일 소스.
 *
 * 바코드/입고 수선전 사진/출고 수선후 사진/작업지시서 아이템 개수는
 * 모두 이 값을 기준으로 맞춰야 "바코드 N개 스캔 ↔ N개 사진/영상" 매칭이 유지된다.
 * repair_parts 가 비어 있으면 1개로 본다. (generateOrderBarcodes 와 동일 규칙)
 */
export function getRepairItemCount(repairParts: unknown[] | null | undefined): number {
  return Array.isArray(repairParts) && repairParts.length > 0 ? repairParts.length : 1;
}

export type PackListItem = {
  seq: number;
  barcodeNo?: string | null;
};

/** 송장 자체(접두어)를 스캔한 경우 — 내품 바코드가 아님 */
export const PACK_SCAN_WAYBILL = "WAYBILL" as const;

/**
 * 출고 내품 스캔값 → 아이템 순번.
 * DB 바코드 또는 `{송장/주문번호}-{seq}` 형식을 인정한다.
 */
export function matchPackedItemSeq(
  scanned: string,
  items: PackListItem[],
  prefixes: string[] = [],
): number | typeof PACK_SCAN_WAYBILL | null {
  const q = scanned.trim();
  if (!q) return null;

  const cleanPrefixes = prefixes.map((p) => p.trim()).filter(Boolean);
  if (cleanPrefixes.includes(q)) return PACK_SCAN_WAYBILL;

  for (const item of items) {
    if (item.barcodeNo && item.barcodeNo === q) return item.seq;
    for (const prefix of cleanPrefixes) {
      if (buildBarcodeNo(prefix, item.seq) === q) return item.seq;
    }
  }
  return null;
}

export function canStartOutboundPackScan(args: {
  itemCount: number;
  photoDoneCount: number;
}): boolean {
  return args.itemCount > 0 && args.photoDoneCount >= args.itemCount;
}

export function shouldAutoFinishPacking(args: {
  itemCount: number;
  sessionPackedSeqs: number[];
  photosComplete: boolean;
}): boolean {
  if (!args.photosComplete || args.itemCount <= 0) return false;
  const packed = new Set(args.sessionPackedSeqs);
  for (let seq = 1; seq <= args.itemCount; seq++) {
    if (!packed.has(seq)) return false;
  }
  return true;
}

export type PackScanFailReason =
  | "EMPTY"
  | "PHOTOS_INCOMPLETE"
  | "WAYBILL"
  | "UNKNOWN"
  | "ALREADY_PACKED"
  | "PHOTO_MISSING";

export type PackScanDecision =
  | { ok: true; seq: number }
  | { ok: false; reason: PackScanFailReason; seq?: number };

/** 출고 내품 스캔 한 건의 허용/거절. 사진 미완이면 스캔 자체를 막는다. */
export function resolveOutboundPackScan(args: {
  scanned: string;
  items: PackListItem[];
  prefixes?: string[];
  photoDoneCount: number;
  photoDoneSeqs: number[];
  packedSeqs: number[];
}): PackScanDecision {
  const q = args.scanned.trim();
  if (!q) return { ok: false, reason: "EMPTY" };

  if (
    !canStartOutboundPackScan({
      itemCount: args.items.length,
      photoDoneCount: args.photoDoneCount,
    })
  ) {
    return { ok: false, reason: "PHOTOS_INCOMPLETE" };
  }

  const matched = matchPackedItemSeq(q, args.items, args.prefixes ?? []);
  if (matched === PACK_SCAN_WAYBILL) return { ok: false, reason: "WAYBILL" };
  if (matched == null) return { ok: false, reason: "UNKNOWN" };
  if (args.packedSeqs.includes(matched)) {
    return { ok: false, reason: "ALREADY_PACKED", seq: matched };
  }
  if (!args.photoDoneSeqs.includes(matched)) {
    return { ok: false, reason: "PHOTO_MISSING", seq: matched };
  }
  return { ok: true, seq: matched };
}

export function packScanFailMessage(
  reason: PackScanFailReason,
  extra?: { doneCount?: number; totalCount?: number; seq?: number },
): string | null {
  switch (reason) {
    case "EMPTY":
      return null;
    case "PHOTOS_INCOMPLETE":
      return `수선 후 사진을 먼저 저장하세요 (${extra?.doneCount ?? 0}/${extra?.totalCount ?? 0})`;
    case "WAYBILL":
      return "송장이 아니라 내품 바코드(-01)를 스캔하세요";
    case "UNKNOWN":
      return "이 주문 내품이 아닙니다";
    case "ALREADY_PACKED":
      return extra?.seq ? `#${extra.seq} 이미 담았습니다` : "이미 담았습니다";
    case "PHOTO_MISSING":
      return extra?.seq ? `#${extra.seq} 수선 후 사진을 먼저 저장하세요` : "수선 후 사진을 먼저 저장하세요";
  }
}

export interface BarcodeRow {
  order_id: string;
  barcode_no: string;
  seq: number;
  item_name: string | null;
}

/**
 * order_barcodes 레코드 INSERT (입고 처리 시 호출)
 * 이미 존재하면 무시 (upsert ignoreDuplicates)
 * 바코드 번호: trackingNo 있으면 "{trackingNo}-01" 형식, 없으면 orderNumber 사용
 */
export async function generateOrderBarcodes(
  db: SupabaseClient,
  orderId: string,
  orderNumber: string,
  repairParts: unknown[],
  trackingNo?: string | null,
): Promise<{ rows: BarcodeRow[]; error: string | null }> {
  const parts = repairParts.length > 0 ? repairParts : [null];
  const barcodePrefix = trackingNo || orderNumber;

  const rows: BarcodeRow[] = parts.map((part, i) => ({
    order_id: orderId,
    barcode_no: buildBarcodeNo(barcodePrefix, i + 1),
    seq: i + 1,
    item_name: normalizeRepairPart(part).slice(0, 40) || null,
  }));

  const { error } = await (db as any)
    .from("order_barcodes")
    .upsert(rows, { onConflict: "barcode_no", ignoreDuplicates: true }) as { error: { message: string } | null };

  if (error) return { rows: [], error: error.message };

  // upsert 후 실제 저장된 rows를 재조회하여 정확한 수를 반환
  const { data: saved } = await (db as any)
    .from("order_barcodes")
    .select("*")
    .eq("order_id", rows[0].order_id)
    .order("seq") as { data: BarcodeRow[] | null };

  return { rows: saved ?? rows, error: null };
}

/**
 * order_barcodes printed_at 일괄 갱신
 */
export async function markBarcodesAsPrinted(db: SupabaseClient, orderId: string) {
  return (db as any)
    .from("order_barcodes")
    .update({ printed_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("printed_at", null);
}
