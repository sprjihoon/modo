// 토스페이먼츠 빌링키로 결제
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || ''
const TOSS_API_URL = 'https://api.tosspayments.com/v1/billing'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경변수 확인
    if (!TOSS_SECRET_KEY) {
      throw new Error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.')
    }

    const {
      billing_key,
      order_id,
      amount,
      order_name,
    } = await req.json()

    // 토스페이먼츠 빌링 결제 API 호출
    const response = await fetch(`${TOSS_API_URL}/${billing_key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: billing_key,
        amount: amount,
        orderId: order_id,
        orderName: order_name,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '결제 실패')
    }

    // Supabase에 결제 기록 저장
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient.from('payments').insert({
      order_id: order_id,
      payment_key: data.paymentKey,
      amount: amount,
      status: data.status,
      method: 'CARD',
      provider: 'TOSSPAYMENTS',
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payment_key: data.paymentKey,
          status: data.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

