import type { PublicReview } from "@/lib/reviews";

export const PREVIEW_REVIEWS: PublicReview[] = [
  {
    id: "preview-1",
    rating: 5,
    content: "기장이 딱 맞게 나왔어요. 택배 수거도 편하고 마감이 깔끔합니다.",
    photo_urls: [],
    display_name: "김**",
    repair_summary: "바지 · 기장수선",
    points_type: "text",
    reviewed_at: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "preview-2",
    rating: 5,
    content: "지퍼 교체했는데 새 옷처럼 됐습니다. 마감이 꼼꼼합니다.",
    photo_urls: [],
    display_name: "이**",
    repair_summary: "점퍼 · 지퍼수선",
    points_type: "text",
    reviewed_at: "2026-08-18T09:00:00.000Z",
  },
  {
    id: "preview-3",
    rating: 5,
    content: "허리 수선이 자연스러워요. 입었을 때 라인도 예쁘고 만족합니다.",
    photo_urls: [],
    display_name: "박**",
    repair_summary: "스커트 · 허리수선",
    points_type: "text",
    reviewed_at: "2026-08-15T09:00:00.000Z",
  },
  {
    id: "preview-4",
    rating: 5,
    content: "코트 단추와 안감까지 신경 써 주셨어요. 다음에도 여기로 맡기려고요.",
    photo_urls: [],
    display_name: "정**",
    repair_summary: "코트 · 단추수선",
    points_type: "text",
    reviewed_at: "2026-08-05T09:00:00.000Z",
  },
];

export const PREVIEW_AVERAGE = 5;
export const PREVIEW_COUNT = PREVIEW_REVIEWS.length;

export function isDesignQuery() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("design") === "1";
}

/** `/reviews/design` 미리보기 전용. 홈·목록은 DB만 사용한다. */
