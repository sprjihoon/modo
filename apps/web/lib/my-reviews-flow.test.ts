import type { MyReview } from "./reviews";
import {
  applyDeleteSuccess,
  applyEditSuccess,
  applyWriteSuccess,
  canCreateReview,
  editReviewHref,
  mineErrorMessage,
  resolveMyReviewsView,
  reviewOrderHref,
  validateReviewDraft,
  writeReviewHref,
} from "./my-reviews-flow";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const review: MyReview = {
  id: "r1",
  order_id: "o1",
  rating: 5,
  content: "기장이 딱 맞게 줄여졌어요.",
  photo_urls: [],
  display_name: "고**",
  repair_summary: "바지 · 기장수선",
  clothing_type: "바지",
  points_type: "text",
  reviewed_at: "2026-08-20T00:00:00.000Z",
  status: "pending",
  points_awarded: 200,
};

assert(resolveMyReviewsView({ loading: true }).kind === "loading", "로딩");

assert(resolveMyReviewsView({ error: "서버 오류" }).kind === "error", "그 외 오류");

assert(resolveMyReviewsView({ reviews: [], pendingOrders: [] }).kind === "empty", "둘 다 없으면 빈 화면");

const pendingOnly = resolveMyReviewsView({
  pendingOrders: [{ id: "o2", item_name: "셔츠 · 소매기장" }],
  reviews: [],
});
assert(pendingOnly.kind === "list", "작성할 주문만 있으면 목록");
if (pendingOnly.kind === "list") {
  assert(pendingOnly.pendingOrders.length === 1, "작성하기 카드 1개");
  assert(pendingOnly.reviews.length === 0, "작성한 리뷰 없음");
}

const writtenOnly = resolveMyReviewsView({ reviews: [review], pendingOrders: [] });
assert(writtenOnly.kind === "list", "작성한 리뷰만 있으면 목록");
if (writtenOnly.kind === "list") {
  assert(writtenOnly.reviews.length === 1, "수정·삭제 대상 1개");
  assert(writtenOnly.pendingOrders.length === 0, "작성 카드 없음");
}

const both = resolveMyReviewsView({
  reviews: [review],
  pendingOrders: [{ id: "o2", item_name: "셔츠 · 소매기장" }],
});
assert(both.kind === "list", "작성과 수정이 함께 보임");
if (both.kind === "list") {
  assert(both.pendingOrders[0].id === "o2" && both.reviews[0].id === "r1", "작성·수정 섹션 동시");
}

assert(writeReviewHref("o2") === "/orders/o2/review", "작성 경로");
assert(editReviewHref("r1") === "/profile/reviews/r1/edit", "수정 경로");
assert(reviewOrderHref("o1") === "/orders/o1", "주문 상세 경로");

assert(
  canCreateReview({
    loggedIn: false,
    orderFound: true,
    ownOrder: true,
    status: "DELIVERED",
    alreadyReviewed: false,
  }).ok === false,
  "비로그인은 작성 불가"
);
assert(
  canCreateReview({
    loggedIn: true,
    orderFound: true,
    ownOrder: true,
    status: "OUT_FOR_DELIVERY",
    alreadyReviewed: false,
  }).ok === false,
  "배송완료 전 작성 불가"
);
assert(
  canCreateReview({
    loggedIn: true,
    orderFound: true,
    ownOrder: true,
    status: "DELIVERED",
    alreadyReviewed: true,
  }).ok === false,
  "이미 쓴 주문은 다시 작성 불가"
);
assert(
  canCreateReview({
    loggedIn: true,
    orderFound: true,
    ownOrder: true,
    status: "DELIVERED",
    alreadyReviewed: false,
  }).ok === true,
  "배송완료 + 미작성은 작성 가능"
);

assert(validateReviewDraft({ rating: 5, content: "짧음" }).ok === false, "짧은 글 작성 불가");
assert(validateReviewDraft({ rating: 0, content: "충분히 긴 리뷰입니다." }).ok === false, "별점 0 불가");
assert(validateReviewDraft({ rating: 5, content: "충분히 긴 리뷰입니다." }).ok === true, "정상 작성");
assert(
  validateReviewDraft({ rating: 5, content: "충분히 긴 리뷰입니다.", photoCount: 6 }).ok === false,
  "사진 6장 불가"
);

const afterWrite = applyWriteSuccess(
  [{ id: "o1", item_name: "바지 · 기장수선" }, { id: "o2", item_name: "셔츠 · 소매기장" }],
  [],
  review
);
assert(afterWrite.pendingOrders.map((o) => o.id).join(",") === "o2", "작성하면 해당 주문이 작성 목록에서 빠짐");
assert(afterWrite.reviews[0].id === "r1", "작성한 리뷰가 내 리뷰에 생김");

const afterDelete = applyDeleteSuccess(afterWrite.pendingOrders, afterWrite.reviews, {
  id: "r1",
  order_id: "o1",
  item_name: "바지 · 기장수선",
});
assert(afterDelete.reviews.length === 0, "삭제하면 작성한 리뷰에서 빠짐");
assert(afterDelete.pendingOrders.some((o) => o.id === "o1"), "삭제하면 다시 작성할 수 있음");

const afterCancelDelete = applyDeleteSuccess(
  [{ id: "o2", item_name: "셔츠 · 소매기장" }],
  [review],
  { id: "not-deleted", order_id: "x" }
);
assert(afterCancelDelete.reviews.length === 1, "다른 리뷰를 지우면 기존 리뷰는 유지");

const afterEdit = applyEditSuccess([review], {
  ...review,
  content: "수정한 내용은 검수 후 다시 공개됩니다.",
  status: "approved",
});
assert(afterEdit[0].status === "pending", "수정하면 다시 검수 중");
assert(afterEdit[0].content.includes("수정한 내용"), "수정 내용 반영");

const afterWriteView = resolveMyReviewsView(afterWrite);
assert(afterWriteView.kind === "list", "작성 후에도 목록 유지");
const afterDeleteView = resolveMyReviewsView(afterDelete);
assert(afterDeleteView.kind === "list", "하나 지워도 다른 작성 가능 주문이 있으면 목록");
assert(
  resolveMyReviewsView(applyDeleteSuccess([], [review], { id: "r1", order_id: "o1", item_name: "바지 · 기장수선" })).kind ===
    "list",
  "마지막 리뷰를 지워도 다시 작성할 수 있으면 빈 화면이 아님"
);
assert(
  resolveMyReviewsView({ reviews: [], pendingOrders: [] }).kind === "empty",
  "작성·작성가능이 모두 없으면 빈 화면"
);

console.log("my-reviews-flow.test.ts ok");
