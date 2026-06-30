// 포트원 V2 빌링키로 결제
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

    const { billing_key, order_id, amount, order_name, customer_id } = await req.json()

    if (!billing_key || !order_id || !amount) {
      throw new Error('필수 파라미터가 누락되었습니다. (billing_key, order_id, amount)')
    }

    // 포트원 V2 빌링키 결제: paymentId는 고객사가 채번
    const paymentId = `billing-${order_id}-${Date.now()}`

    const response = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
      {
        method: 'POST',
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingKey: billing_key,
          orderName: order_name || '모두의수선 수선 서비스',
          customer: customer_id ? { id: customer_id } : undefined,
          amount: { total: amount },
          currency: 'KRW',
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '결제 실패')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient.from('payments').insert({
      order_id: order_id,
      payment_id: paymentId,
      amount: amount,
      status: data.status,
      method: 'CARD',
      provider: 'PORTONE',
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payment_id: paymentId,
          status: data.status,
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
