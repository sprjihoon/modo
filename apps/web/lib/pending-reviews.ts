import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingReviewOrder = {
  id: string;
  item_name: string;
};

export const REVIEW_INVITE_DISMISS_KEY = "review_invite_dismissed";

export const DEFAULT_REVIEW_SETTINGS = {
  text_review_points: 200,
  photo_review_points: 500,
  is_active: true,
  min_content_length: 10,
};

/** 배송완료 주문 중 아직 리뷰가 없는 것만 남긴다. */
export function selectPendingReviewOrders(
  orders: Array<{ id: string; item_name?: string | null }>,
  reviewedOrderIds: Array<string | null | undefined>
): PendingReviewOrder[] {
  const reviewed = new Set(
    reviewedOrderIds.filter((id): id is string => Boolean(id))
  );
  return orders
    .filter((order) => order.id && !reviewed.has(order.id))
    .map((order) => ({ id: order.id, item_name: order.item_name?.trim() || "수선" }));
}

/** 홈 자동 팝업: 한 번 닫으면 다시 열지 않는다. */
export function shouldAutoShowReviewInvite(opts: {
  dismissed: boolean;
  pendingOrderId?: string | null;
}): boolean {
  return !opts.dismissed && Boolean(opts.pendingOrderId);
}

export async function listPendingReviewOrders(
  admin: SupabaseClient,
  userId: string,
  limit = 50
): Promise<PendingReviewOrder[]> {
  const { data: orders } = await admin
    .from("orders")
    .select("id, item_name, completed_at")
    .eq("user_id", userId)
    .eq("status", "DELIVERED")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  const ids = (orders ?? []).map((o) => o.id);
  if (ids.length === 0) return [];

  const { data: reviews } = await admin
    .from("reviews")
    .select("order_id")
    .eq("user_id", userId)
    .in("order_id", ids);

  return selectPendingReviewOrders(
    orders ?? [],
    (reviews ?? []).map((r) => r.order_id)
  );
}
