/** 주문 취소/환불 시 사용 포인트 복구 (잔여분 기준, idempotent RPC) */
export async function restoreOrderPointsUsed(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> },
  orderId: string,
  amount?: number,
) {
  if (amount != null && amount <= 0) return;
  try {
    const args: Record<string, unknown> = { p_order_id: orderId };
    if (amount != null) args.p_amount = Math.floor(amount);
    const { error } = await admin.rpc('restore_order_points_used', args);
    if (error) console.warn('[restoreOrderPointsUsed]', orderId, error.message);
  } catch (e) {
    console.warn('[restoreOrderPointsUsed]', orderId, e);
  }
}
