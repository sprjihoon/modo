import {
  PREVIEW_REVIEWS,
  ensurePreviewReviews,
  previewReviewKey,
  publicReviewStats,
} from "./review-preview";
import type { PublicReview } from "./reviews";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const live: PublicReview = {
  id: "live-1",
  rating: 4,
  content: "실제 고객 리뷰",
  photo_urls: [],
  display_name: "최**",
  clothing_type: "원피스",
  repair_summary: "원피스 · 기장수선",
  points_type: "text",
  reviewed_at: "2026-09-01T00:00:00.000Z",
};

assert(PREVIEW_REVIEWS.length === 4, "미리보기 4건");
assert(ensurePreviewReviews([]).length === 4, "비어 있으면 미리보기 4건");
assert(ensurePreviewReviews([live]).length === 5, "실제 리뷰가 있어도 미리보기 4건을 붙인다");
assert(ensurePreviewReviews(PREVIEW_REVIEWS).length === 4, "같은 내용은 중복하지 않는다");
assert(
  ensurePreviewReviews(PREVIEW_REVIEWS.map((review) => ({ ...review, id: `db-${review.id}` }))).length === 4,
  "DB에 같은 글이 있으면 미리보기 id를 또 넣지 않는다"
);

const pants = ensurePreviewReviews([], { clothing: "바지" });
assert(pants.length === 1 && pants[0].display_name === "김**", "바지 필터");

const outer = ensurePreviewReviews([], { clothing: "점퍼" });
assert(outer.length === 2, "점퍼는 아우터 미리보기와 묶인다");

assert(ensurePreviewReviews([], { photoOnly: true }).length === 0, "포토 필터에는 글 리뷰를 넣지 않는다");

assert(
  previewReviewKey(PREVIEW_REVIEWS[0]) ===
    "김**|기장이 딱 맞게 나왔어요. 택배 수거도 편하고 마감이 깔끔합니다.",
  "key"
);

const emptyDb = publicReviewStats({
  reviews: ensurePreviewReviews([]),
  approvedCount: 0,
  average: 0,
  extraCount: 4,
});
assert(emptyDb.count === 4 && emptyDb.average === 5, "DB가 비면 미리보기 통계");

const withLive = publicReviewStats({
  reviews: ensurePreviewReviews([live]),
  approvedCount: 1,
  average: 4,
  extraCount: 4,
});
assert(withLive.count === 5, "실제 리뷰 + 미리보기 건수");

console.log("review-preview.test.ts ok");
