import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 부분 취소 시 복구할 포인트.
 * 1P = 1원. 분모는 포인트 차감 전 주문액(결제액 + 사용 포인트).
 */
export function calcPartialRestorePoints(
  pointsUsed: number,
  totalPrice: number,
  cancelAmount: number
): number {
  const used = Math.max(0, Math.floor(Number(pointsUsed) || 0));
  const cancel = Math.max(0, Math.floor(Number(cancelAmount) || 0));
  const base = Math.max(0, Math.floor(Number(totalPrice) || 0)) + used;
  if (used <= 0 || cancel <= 0 || base <= 0) return 0;
  return Math.min(used, Math.floor((used * cancel) / base));
}

/** 주문 취소/환불 시 사용 포인트 복구 (잔여분 기준, idempotent RPC) */
export async function restoreOrderPointsUsed(
  admin: SupabaseClient,
  orderId: string,
  amount?: number
) {
  if (amount != null && amount <= 0) return;
  try {
    const args: { p_order_id: string; p_amount?: number } = {
      p_order_id: orderId,
    };
    if (amount != null) {
      args.p_amount = Math.floor(amount);
    }
    const { error } = await (admin as SupabaseClient).rpc(
      "restore_order_points_used",
      args
    );
    if (error) {
      console.warn("[restoreOrderPointsUsed]", orderId, error.message);
    }
  } catch (e) {
    console.warn("[restoreOrderPointsUsed]", orderId, e);
  }
}
