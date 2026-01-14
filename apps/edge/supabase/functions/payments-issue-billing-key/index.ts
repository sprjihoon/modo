// 토스페이먼츠 빌링키 발급
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || ''
const TOSS_API_URL = 'https://api.tosspayments.com/v1/billing/authorizations/card'

serve(async (req) => {
  // CORS headers
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
      customer_id,
      card_number,
      expiry_year,
      expiry_month,
      card_password,
      identity_number,
      customer_name,
    } = await req.json()

    // 토스페이먼츠 API 호출
    const response = await fetch(TOSS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: customer_id,
        cardNumber: card_number,
        cardExpirationYear: expiry_year,
        cardExpirationMonth: expiry_month,
        cardPassword: card_password,
        customerIdentityNumber: identity_number,
        customerName: customer_name,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '빌링키 발급 실패')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          billing_key: data.billingKey,
          card_company: data.card?.company || '알 수 없음',
          card_type: data.card?.cardType || '신용',
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

