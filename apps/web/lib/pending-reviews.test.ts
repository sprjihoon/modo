import {
  DEFAULT_REVIEW_SETTINGS,
  REVIEW_INVITE_DISMISS_KEY,
  selectPendingReviewOrders,
  shouldAutoShowReviewInvite,
} from "./pending-reviews";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(REVIEW_INVITE_DISMISS_KEY === "review_invite_dismissed", "dismiss storage key");
assert(DEFAULT_REVIEW_SETTINGS.text_review_points === 200, "text points");
assert(DEFAULT_REVIEW_SETTINGS.photo_review_points === 500, "photo points");
assert(DEFAULT_REVIEW_SETTINGS.min_content_length === 10, "min length");

assert(
  selectPendingReviewOrders([], []).length === 0,
  "주문 없으면 빈 목록"
);

assert(
  JSON.stringify(
    selectPendingReviewOrders(
      [
        { id: "o1", item_name: "바지 · 기장수선" },
        { id: "o2", item_name: "셔츠 · 소매기장" },
      ],
      ["o1"]
    )
  ) === JSON.stringify([{ id: "o2", item_name: "셔츠 · 소매기장" }]),
  "이미 쓴 주문은 작성 목록에서 제외"
);

assert(
  selectPendingReviewOrders([{ id: "o3", item_name: "   " }], []).length === 1 &&
    selectPendingReviewOrders([{ id: "o3", item_name: "   " }], [])[0].item_name === "수선",
  "이름 없으면 수선으로 표시"
);

assert(
  selectPendingReviewOrders([{ id: "o4", item_name: null }], ["o4"]).length === 0,
  "리뷰 있는 주문은 이름과 관계없이 제외"
);

assert(
  shouldAutoShowReviewInvite({ dismissed: false, pendingOrderId: "o1" }) === true,
  "닫은 적 없고 작성할 주문이 있으면 팝업"
);
assert(
  shouldAutoShowReviewInvite({ dismissed: true, pendingOrderId: "o1" }) === false,
  "한 번 닫으면 다시 안 열림"
);
assert(
  shouldAutoShowReviewInvite({ dismissed: false, pendingOrderId: null }) === false,
  "작성할 주문 없으면 안 열림"
);
assert(
  shouldAutoShowReviewInvite({ dismissed: false, pendingOrderId: "" }) === false,
  "빈 주문 id는 안 열림"
);

console.log("pending-reviews.test.ts ok");
