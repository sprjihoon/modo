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
 * 바코드 번호 생성: {order_number}-{seq:02d}
 * 예: ORD-20260706-001-01
 */
export function buildBarcodeNo(orderNumber: string, seq: number): string {
  return `${orderNumber}-${String(seq).padStart(2, "0")}`;
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

export interface BarcodeRow {
  order_id: string;
  barcode_no: string;
  seq: number;
  item_name: string | null;
}

/**
 * order_barcodes 레코드 INSERT (입고 처리 시 호출)
 * 이미 존재하면 무시 (upsert ignoreDuplicates)
 */
export async function generateOrderBarcodes(
  db: SupabaseClient,
  orderId: string,
  orderNumber: string,
  repairParts: unknown[],
): Promise<{ rows: BarcodeRow[]; error: string | null }> {
  const parts = repairParts.length > 0 ? repairParts : [null];

  const rows: BarcodeRow[] = parts.map((part, i) => ({
    order_id: orderId,
    barcode_no: buildBarcodeNo(orderNumber, i + 1),
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
