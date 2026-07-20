import type { SupabaseClient } from "@supabase/supabase-js";

/** 주문 취소/환불 시 사용 포인트 복구 (idempotent RPC) */
export async function restoreOrderPointsUsed(
  admin: SupabaseClient,
  orderId: string
) {
  try {
    const { error } = await admin.rpc("restore_order_points_used", {
      p_order_id: orderId,
    });
    if (error) {
      console.warn("[restoreOrderPointsUsed]", orderId, error.message);
    }
  } catch (e) {
    console.warn("[restoreOrderPointsUsed]", orderId, e);
  }
}
