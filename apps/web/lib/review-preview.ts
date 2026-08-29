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
    content: "지퍼 교체했는데 새 옷처럼 됐습니다. 사진처럼 꼼꼼하게 해주셨어요.",
    photo_urls: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&h=400&q=80",
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&h=400&q=80",
    ],
    display_name: "이**",
    repair_summary: "점퍼 · 지퍼수선",
    points_type: "photo",
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
    content: "소매 기장 줄였는데 비율이 잘 맞아요. 배송도 빠르고 포장도 정성스러웠습니다.",
    photo_urls: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&h=400&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&h=400&q=80",
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=400&h=400&q=80",
    ],
    display_name: "최**",
    repair_summary: "셔츠 · 소매기장",
    points_type: "photo",
    reviewed_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "preview-5",
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

/** 공개 리뷰가 없을 때 디자인 확인용 샘플을 사용한다. */
export function withSampleReviews(reviews: PublicReview[] | null | undefined): {
  reviews: PublicReview[];
  average: number;
  count: number;
} {
  if (reviews && reviews.length > 0) {
    const average =
      Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
    return { reviews, average, count: reviews.length };
  }
  return { reviews: PREVIEW_REVIEWS, average: PREVIEW_AVERAGE, count: PREVIEW_COUNT };
}
