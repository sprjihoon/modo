/** 관리자 주문 상세에 보여줄 현재 입고/출고 영상 */
export const ADMIN_ORDER_VIDEO_TYPES = ["inbound_video", "outbound_video"] as const;

export const ADMIN_PHOTO_TYPES = ["before_photo", "after_photo"] as const;

export const ADMIN_VIDEO_TYPE_FILTERS = [
  { value: "outbound_video", label: "출고 영상" },
  { value: "inbound_video", label: "입고 영상" },
  { value: "box_open_video", label: "박스오픈 (구)" },
  { value: "packing_video", label: "포장 영상 (구)" },
  { value: "merged_video", label: "병합 영상 (구)" },
  { value: "work_video", label: "작업 영상 (구)" },
  { value: "all", label: "전체" },
] as const;

export function uniqueMediaKeys(...values: unknown[]): string[] {
  return values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

/** media.final_waybill_no 조회 키. 입고/출고 사진·영상이 붙는 송장·주문 ID를 모두 넣는다. */
export function collectMediaLookupKeys(args: {
  orderId?: string | null;
  orderTrackingNo?: string | null;
  pickupTrackingNo?: string | null;
  deliveryTrackingNo?: string | null;
  shipmentTrackingNo?: string | null;
}): string[] {
  return uniqueMediaKeys(
    args.orderId,
    args.orderTrackingNo,
    args.pickupTrackingNo,
    args.deliveryTrackingNo,
    args.shipmentTrackingNo,
  );
}

export function isAdminOrderVideoType(type: string): boolean {
  return type === "inbound_video" || type === "outbound_video";
}

export function isRepairPhotoType(type: string): boolean {
  return type === "before_photo" || type === "after_photo";
}

export function isMediaExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= now;
}

export function filterAdminOrderVideos<T extends { type: string; expires_at?: string | null }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return rows.filter(
    (row) => isAdminOrderVideoType(row.type) && !isMediaExpired(row.expires_at, now),
  );
}

export function groupRepairPhotos<T extends { type: string; sequence?: number | null; path?: string | null }>(
  rows: T[],
  toUrl: (path: string) => string,
): Record<number, { before?: string; after?: string }> {
  const bySequence: Record<number, { before?: string; after?: string }> = {};
  for (const row of rows) {
    if (!isRepairPhotoType(row.type) || !row.path) continue;
    const seq = row.sequence || 1;
    if (!bySequence[seq]) bySequence[seq] = {};
    const url = toUrl(row.path);
    if (row.type === "before_photo") bySequence[seq].before = url;
    else bySequence[seq].after = url;
  }
  return bySequence;
}

export function splitOrderVideosByType<T extends { type: string; sequence?: number | null }>(
  videos: T[],
): {
  inbound: T[];
  outbound: T[];
  boxOpen: T[];
  packing: T[];
} {
  const bySeq = (a: T, b: T) => (a.sequence || 0) - (b.sequence || 0);
  return {
    inbound: videos.filter((v) => v.type === "inbound_video").sort(bySeq),
    outbound: videos.filter((v) => v.type === "outbound_video").sort(bySeq),
    boxOpen: videos.filter((v) => v.type === "box_open_video").sort(bySeq),
    packing: videos.filter((v) => v.type === "packing_video").sort(bySeq),
  };
}

export function cloudflareHlsUrl(videoId: string): string {
  return `https://videodelivery.net/${videoId}/manifest/video.m3u8`;
}

export function cloudflareWatchUrl(videoId: string): string {
  return `https://iframe.videodelivery.net/${videoId}`;
}

export function adminMediaPlaybackUrl(args: { provider?: string | null; path: string }): string {
  if (args.path.startsWith("http")) return args.path;
  if (args.provider === "cloudflare") return cloudflareHlsUrl(args.path);
  return args.path;
}

export function adminVideoTypeLabel(type: string): string {
  if (type === "inbound_video") return "입고";
  if (type === "outbound_video") return "출고";
  if (type === "box_open_video") return "박스오픈";
  if (type === "packing_video") return "포장";
  if (type === "work_video") return "작업";
  return type;
}

export function adminVideoFilterLabel(type: string): string {
  return ADMIN_VIDEO_TYPE_FILTERS.find((t) => t.value === type)?.label ?? type;
}
