export type ReviewStatus = "pending" | "approved" | "hidden";
export type ReviewPointsType = "photo" | "text";

export interface PublicReview {
  id: string;
  rating: number;
  content: string;
  photo_urls: string[];
  display_name: string;
  repair_summary: string | null;
  clothing_type: string | null;
  points_type: ReviewPointsType | null;
  reviewed_at: string;
}

export interface MyReview extends PublicReview {
  order_id: string;
  status: ReviewStatus;
  points_awarded: number;
}

export interface ReviewSettings {
  text_review_points: number;
  photo_review_points: number;
  is_active: boolean;
  min_content_length: number;
}

export const STAR_MIN = 1;
export const STAR_MAX = 5;
export const REVIEW_PHOTO_MAX = 5;

/** 수선 신청 대분류와 다른 표기를 같은 필터로 묶는다. */
export const CLOTHING_TYPE_ALIASES: Record<string, string> = {
  점퍼: "아우터",
  코트: "아우터",
  패딩: "아우터",
  자켓: "아우터",
  재킷: "아우터",
  스커트: "치마",
  팬츠: "바지",
};

export const DEFAULT_REVIEW_CLOTHING_TYPES = [
  "아우터",
  "티셔츠/맨투맨",
  "셔츠/블라우스",
  "원피스",
  "바지",
  "청바지",
  "치마",
] as const;

export function normalizeClothingType(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  return CLOTHING_TYPE_ALIASES[trimmed] ?? trimmed;
}

export function clothingTypeFromSummary(summary: string | null | undefined): string | null {
  const first = (summary ?? "").split("·")[0]?.trim() ?? "";
  return normalizeClothingType(first);
}

export function resolveClothingType(order: {
  clothing_type?: string | null;
  item_name?: string | null;
}, summary?: string | null): string | null {
  return (
    normalizeClothingType(order.clothing_type) ??
    clothingTypeFromSummary(summary) ??
    clothingTypeFromSummary(order.item_name)
  );
}

export function clothingFilterValues(selected: string): string[] {
  const normalized = normalizeClothingType(selected) ?? selected.trim();
  if (!normalized) return [];
  const aliases = Object.entries(CLOTHING_TYPE_ALIASES)
    .filter(([, canon]) => canon === normalized)
    .map(([alias]) => alias);
  return Array.from(new Set([normalized, selected.trim(), ...aliases].filter(Boolean)));
}

export function isWholeStarRating(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= STAR_MIN && (value as number) <= STAR_MAX;
}

/** 성명 전체 노출 금지. 장지훈 → 장** */
export function maskDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "고**";
  return `${trimmed[0]}**`;
}

export function buildRepairSummary(order: {
  item_name?: string | null;
  clothing_type?: string | null;
  repair_parts?: unknown;
}): string {
  if (order.item_name?.trim()) return order.item_name.trim();

  const parts: string[] = [];
  if (order.clothing_type?.trim()) parts.push(order.clothing_type.trim());

  const raw = order.repair_parts;
  if (Array.isArray(raw)) {
    for (const p of raw) {
      if (!p) continue;
      if (typeof p === "string") {
        const s = p.trim();
        if (s.startsWith("{")) {
          try {
            const parsed = JSON.parse(s) as { name?: string };
            if (parsed.name) parts.push(parsed.name);
            continue;
          } catch {
            parts.push(s);
            continue;
          }
        }
        parts.push(s);
      } else if (typeof p === "object" && p && "name" in p) {
        const name = (p as { name?: string }).name;
        if (name) parts.push(name);
      }
    }
  }

  return parts.filter(Boolean).slice(0, 3).join(" · ") || "의류 수선";
}

export function reviewStatusLabel(status: ReviewStatus): string {
  if (status === "approved") return "공개";
  if (status === "hidden") return "비공개 · 나만 보임";
  return "검수 중 · 나만 보임";
}

export function toPublicReview(row: {
  id: string;
  rating: number;
  content: string;
  photo_urls: string[] | null;
  display_name: string;
  repair_summary: string | null;
  clothing_type?: string | null;
  points_type: string | null;
  reviewed_at: string;
}): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    content: row.content,
    photo_urls: row.photo_urls ?? [],
    display_name: row.display_name,
    repair_summary: row.repair_summary,
    clothing_type: row.clothing_type ?? clothingTypeFromSummary(row.repair_summary),
    points_type: row.points_type === "photo" || row.points_type === "text" ? row.points_type : null,
    reviewed_at: row.reviewed_at,
  };
}

export function toMyReview(row: {
  id: string;
  order_id: string;
  rating: number;
  content: string;
  photo_urls: string[] | null;
  display_name: string;
  repair_summary: string | null;
  points_type: string | null;
  reviewed_at: string;
  status: string;
  points_awarded: number | null;
}): MyReview {
  return {
    ...toPublicReview(row),
    order_id: row.order_id,
    status: row.status === "approved" || row.status === "hidden" ? row.status : "pending",
    points_awarded: row.points_awarded ?? 0,
  };
}

export const REVIEW_IMAGE_BUCKET = "review-images";

type ReviewStorage = {
  from: (bucket: string) => {
    remove: (paths: string[]) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export function reviewImagePublicPrefix() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${REVIEW_IMAGE_BUCKET}/`;
}

/** public/sign URL 또는 `{userId}/file.jpg`에서 review-images 경로만 뽑는다. */
export function reviewImagePathFromUrl(url: string): string | null {
  const raw = (url || "").trim();
  if (!raw) return null;

  const markers = [
    `/object/public/${REVIEW_IMAGE_BUCKET}/`,
    `/object/sign/${REVIEW_IMAGE_BUCKET}/`,
    `/object/authenticated/${REVIEW_IMAGE_BUCKET}/`,
  ];
  for (const marker of markers) {
    const idx = raw.indexOf(marker);
    if (idx >= 0) {
      const rest = raw.slice(idx + marker.length).split("?")[0];
      try {
        return decodeURIComponent(rest);
      } catch {
        return rest;
      }
    }
  }

  const bare = raw.split("?")[0];
  if (!raw.startsWith("http") && /^[0-9a-f-]{36}\/[^/]+$/i.test(bare)) {
    return bare;
  }
  return null;
}

export function sanitizeReviewPhotoUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((url): url is string => typeof url === "string" && reviewImagePathFromUrl(url) != null)
    .slice(0, REVIEW_PHOTO_MAX);
}

export function reviewImageStoragePaths(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return [...new Set(
    urls
      .filter((url): url is string => typeof url === "string")
      .map(reviewImagePathFromUrl)
      .filter((path): path is string => !!path),
  )];
}

export function unusedReviewPhotoUrls(previous: unknown, next: unknown): string[] {
  const keep = new Set(reviewImageStoragePaths(next));
  if (!Array.isArray(previous)) return [];
  return previous.filter((url): url is string => {
    if (typeof url !== "string") return false;
    const path = reviewImagePathFromUrl(url);
    return path != null && !keep.has(path);
  });
}

export async function removeReviewImages(storage: ReviewStorage, urls: unknown): Promise<void> {
  const paths = reviewImageStoragePaths(urls);
  if (paths.length === 0) return;
  const { error } = await storage.from(REVIEW_IMAGE_BUCKET).remove(paths);
  if (error) console.warn("[review-images] delete failed", error.message);
}
