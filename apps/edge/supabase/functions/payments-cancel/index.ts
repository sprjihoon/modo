// 토스페이먼츠 결제 취소
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || ''
const TOSS_API_URL = 'https://api.tosspayments.com/v1/payments'

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
      payment_key,
      cancel_reason,
      cancel_amount,
    } = await req.json()

    // 토스페이먼츠 결제 취소 API 호출
    const response = await fetch(`${TOSS_API_URL}/${payment_key}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason: cancel_reason,
        ...(cancel_amount && { cancelAmount: cancel_amount }),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || '결제 취소 실패')
    }

    // Supabase에 취소 기록 업데이트
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('payments')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancel_reason,
      })
      .eq('payment_key', payment_key)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          status: data.status,
          cancelled_at: data.canceledAt,
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

