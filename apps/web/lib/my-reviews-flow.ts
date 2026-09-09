import type { MyReview } from "./reviews";
import { STAR_MAX, STAR_MIN, REVIEW_PHOTO_MAX } from "./reviews";
import type { PendingReviewOrder } from "./pending-reviews";

export type MyReviewsView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | {
      kind: "list";
      pendingOrders: PendingReviewOrder[];
      reviews: MyReview[];
    };

export function mineErrorMessage(error: string | null | undefined): string | null {
  if (!error) return null;
  return error;
}

export function resolveMyReviewsView(input: {
  loading?: boolean;
  error?: string | null;
  reviews?: MyReview[];
  pendingOrders?: PendingReviewOrder[];
}): MyReviewsView {
  if (input.loading) return { kind: "loading" };

  const error = mineErrorMessage(input.error);
  if (error) return { kind: "error", message: error };

  const reviews = input.reviews ?? [];
  const pendingOrders = input.pendingOrders ?? [];
  if (reviews.length === 0 && pendingOrders.length === 0) return { kind: "empty" };
  return { kind: "list", pendingOrders, reviews };
}

export function writeReviewHref(orderId: string) {
  return `/orders/${orderId}/review`;
}

export function editReviewHref(reviewId: string) {
  return `/profile/reviews/${reviewId}/edit`;
}

export function reviewOrderHref(orderId: string) {
  return `/orders/${orderId}`;
}

export function canCreateReview(input: {
  loggedIn: boolean;
  orderFound: boolean;
  ownOrder: boolean;
  status?: string | null;
  alreadyReviewed: boolean;
}): { ok: true } | { ok: false; status: number; error: string } {
  if (!input.loggedIn) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }
  if (!input.orderFound || !input.ownOrder) {
    return { ok: false, status: 404, error: "주문을 찾을 수 없습니다." };
  }
  if (input.status !== "DELIVERED") {
    return { ok: false, status: 400, error: "배송이 완료된 주문만 리뷰를 작성할 수 있습니다." };
  }
  if (input.alreadyReviewed) {
    return { ok: false, status: 409, error: "이미 이 주문에 리뷰를 작성했습니다." };
  }
  return { ok: true };
}

export function validateReviewDraft(input: {
  rating: number;
  content: string;
  photoCount?: number;
  minLength?: number;
}): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(input.rating) || input.rating < STAR_MIN || input.rating > STAR_MAX) {
    return { ok: false, error: "별점은 1~5점 중 정수로만 선택할 수 있습니다." };
  }
  const minLen = input.minLength ?? 10;
  if (input.content.trim().length < minLen) {
    return { ok: false, error: `리뷰는 ${minLen}자 이상 작성해 주세요.` };
  }
  if ((input.photoCount ?? 0) > REVIEW_PHOTO_MAX) {
    return { ok: false, error: `사진은 최대 ${REVIEW_PHOTO_MAX}장까지 올릴 수 있습니다.` };
  }
  return { ok: true };
}

export function applyWriteSuccess(
  pendingOrders: PendingReviewOrder[],
  reviews: MyReview[],
  written: MyReview
): { pendingOrders: PendingReviewOrder[]; reviews: MyReview[] } {
  return {
    pendingOrders: pendingOrders.filter((order) => order.id !== written.order_id),
    reviews: [written, ...reviews.filter((review) => review.id !== written.id)],
  };
}

export function applyDeleteSuccess(
  pendingOrders: PendingReviewOrder[],
  reviews: MyReview[],
  deleted: { id: string; order_id: string; item_name?: string }
): { pendingOrders: PendingReviewOrder[]; reviews: MyReview[] } {
  const nextReviews = reviews.filter((review) => review.id !== deleted.id);
  const alreadyPending = pendingOrders.some((order) => order.id === deleted.order_id);
  return {
    reviews: nextReviews,
    pendingOrders: alreadyPending
      ? pendingOrders
      : [
          {
            id: deleted.order_id,
            item_name: deleted.item_name || "수선",
          },
          ...pendingOrders,
        ],
  };
}

export function applyEditSuccess(reviews: MyReview[], updated: MyReview): MyReview[] {
  return reviews.map((review) => (review.id === updated.id ? { ...updated, status: "pending" } : review));
}
