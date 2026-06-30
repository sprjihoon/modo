// 포트원 V2 결제 취소
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET') || ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!PORTONE_API_SECRET) {
      throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.')
    }

    const { payment_id, cancel_reason, cancel_amount } = await req.json()

    if (!payment_id || !cancel_reason) {
      throw new Error('필수 파라미터가 누락되었습니다. (payment_id, cancel_reason)')
    }

    // 포트원 V2 결제 취소 API
    const cancelBody: Record<string, unknown> = { reason: cancel_reason }
    if (cancel_amount) cancelBody.amount = cancel_amount

    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(payment_id)}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelBody),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '결제 취소 실패')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const isTotalCancel = !cancel_amount
    const newStatus = isTotalCancel ? 'CANCELED' : 'PARTIAL_CANCELED'

    await supabaseClient
      .from('orders')
      .update({ payment_status: newStatus, canceled_at: new Date().toISOString() })
      .eq('payment_id', payment_id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: data.payment?.status,
          canceled_at: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
