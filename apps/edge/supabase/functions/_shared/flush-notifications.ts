/** 주문 상태 변경 직후 대기 알림(푸시+Resend)을 바로 처리한다. */
export function flushPendingNotifications(): void {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return;

  void fetch(`${supabaseUrl}/functions/v1/process-pending-notifications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: '{}',
  }).catch((e) => console.warn('flushPendingNotifications failed:', e));
}
