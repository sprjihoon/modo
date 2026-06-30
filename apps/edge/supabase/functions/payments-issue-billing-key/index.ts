// 포트원 V2 빌링키 발급
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET') || ''
const PORTONE_CHANNEL_KEY_BILLING = Deno.env.get('PORTONE_CHANNEL_KEY_BILLING') || ''

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

    const {
      customer_id,
      card_number,
      expiry_year,
      expiry_month,
      card_password,
      identity_number,
      customer_name,
    } = await req.json()

    // 포트원 V2 빌링키 발급 API
    const response = await fetch('https://api.portone.io/billing-keys', {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelKey: PORTONE_CHANNEL_KEY_BILLING,
        customer: { id: customer_id, name: { full: customer_name } },
        method: {
          card: {
            credential: {
              number: card_number,
              expiryYear: expiry_year,
              expiryMonth: expiry_month,
              birthOrBusinessRegistrationNumber: identity_number,
              passwordTwoDigits: card_password,
            },
          },
        },
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
          billing_key: data.billingKeyInfo?.billingKey,
          card_company: data.billingKeyInfo?.methods?.[0]?.card?.issuer || '알 수 없음',
          card_type: data.billingKeyInfo?.methods?.[0]?.card?.cardType || '신용',
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
