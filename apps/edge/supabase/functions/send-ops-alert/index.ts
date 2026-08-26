import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { sendOpsAlertEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const body = await req.json().catch(() => ({}))
    const type = body.type === 'signup' ? 'signup' : body.type === 'order' ? 'order' : null
    if (!type) {
      return json({ success: false, error: 'type=order|signup 필요' }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (type === 'signup') {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, email, phone, created_at')
        .eq('id', body.userId)
        .maybeSingle()
      if (!user) return json({ success: false, error: 'user not found' }, 404)

      const result = await sendOpsAlertEmail({
        title: `신규 가입 · ${user.name || user.email}`,
        lines: [
          `이름: ${user.name || '-'}`,
          `이메일: ${user.email || '-'}`,
          `전화: ${user.phone || '-'}`,
        ],
        href: `https://admin.modo.mom/dashboard/customers/${user.id}`,
      })
      return json({ success: result.sent || result.skipped, ...result })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_price, status, payment_status, order_source')
      .eq('id', body.orderId)
      .maybeSingle()
    if (!order) return json({ success: false, error: 'order not found' }, 404)

    const result = await sendOpsAlertEmail({
      title: `신규 주문 · ${order.order_number}`,
      lines: [
        `주문: ${order.order_number}`,
        `고객: ${order.customer_name || '-'} · ${order.customer_email || '-'}`,
        `금액: ${(order.total_price || 0).toLocaleString('ko-KR')}원`,
        `상태: ${order.status} / ${order.payment_status}`,
        `채널: ${order.order_source || '-'}`,
      ],
      href: `https://admin.modo.mom/dashboard/orders/${order.id}`,
    })
    return json({ success: result.sent || result.skipped, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json({ success: false, error: message }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
