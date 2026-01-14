// 토스페이먼츠 결제 승인 (결제위젯 사용)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || ''
const TOSS_API_URL = 'https://api.tosspayments.com/v1/payments/confirm'

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
      order_id,
      amount,
      is_extra_charge = false,
    } = await req.json()

    // 필수 파라미터 검증
    if (!payment_key || !order_id || !amount) {
      throw new Error('필수 파라미터가 누락되었습니다. (payment_key, order_id, amount)')
    }

    // Supabase 클라이언트 생성
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 주문 정보 조회 및 금액 검증
    let originalAmount: number | null = null
    let orderData: any = null

    if (is_extra_charge) {
      // 추가 비용 결제인 경우 extra_charge_requests에서 조회
      const { data, error } = await supabaseClient
        .from('extra_charge_requests')
        .select('*')
        .eq('id', order_id)
        .single()

      if (error || !data) {
        throw new Error('추가 결제 요청을 찾을 수 없습니다.')
      }
      originalAmount = data.amount
      orderData = data
    } else {
      // 일반 결제인 경우 orders에서 조회
      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, total_price, payment_status, user_id')
        .eq('id', order_id)
        .single()

      if (error || !data) {
        throw new Error('주문 정보를 찾을 수 없습니다.')
      }

      // 이미 결제 완료된 주문 확인
      if (data.payment_status === 'PAID') {
        throw new Error('이미 결제가 완료된 주문입니다.')
      }

      originalAmount = data.total_price
      orderData = data
    }

    // 금액 검증 (클라이언트 조작 방지)
    if (originalAmount && originalAmount !== amount) {
      throw new Error(`결제 금액이 일치하지 않습니다. 주문금액: ${originalAmount}원, 요청금액: ${amount}원`)
    }

    // 토스페이먼츠 결제 승인 API 호출
    const tossResponse = await fetch(TOSS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: payment_key,
        orderId: order_id,
        amount: amount,
      }),
    })

    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('토스페이먼츠 결제 승인 실패:', tossData)
      throw new Error(tossData.message || '결제 승인에 실패했습니다.')
    }

    console.log('✅ 토스페이먼츠 결제 승인 성공:', order_id)

    // DB 업데이트
    if (is_extra_charge) {
      // 추가 비용 결제인 경우
      await supabaseClient
        .from('extra_charge_requests')
        .update({
          status: 'PAID',
          payment_key: payment_key,
          customer_response_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      // 작업자에게 알림 전송
      if (orderData?.worker_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.worker_id,
          type: 'EXTRA_CHARGE_RESPONSE',
          title: '추가 비용 결제 완료',
          body: `고객이 추가 비용 ${amount.toLocaleString()}원을 결제했습니다.`,
          metadata: {
            requestId: order_id,
            orderId: orderData.order_id,
            paymentKey: payment_key,
          },
        })
      }
    } else {
      // 일반 주문 결제인 경우
      await supabaseClient
        .from('orders')
        .update({
          status: 'PAID',  // 주문 상태도 함께 업데이트
          payment_status: 'PAID',
          payment_key: payment_key,
          paid_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      // 고객에게 결제 완료 알림
      if (orderData?.user_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.user_id,
          type: 'PAYMENT_COMPLETED',
          title: '결제 완료',
          body: `${amount.toLocaleString()}원 결제가 완료되었습니다.`,
          order_id: order_id,
        })
      }
    }

    // 결제 로그 저장
    try {
      await supabaseClient.from('payment_logs').insert({
        order_id: is_extra_charge ? orderData?.order_id : order_id,
        payment_key: payment_key,
        amount: tossData.totalAmount,
        method: tossData.method,
        status: 'SUCCESS',
        provider: 'TOSS',
        response_data: tossData,
        approved_at: tossData.approvedAt,
      })
    } catch (logError) {
      // 로그 저장 실패는 무시 (테이블이 없을 수 있음)
      console.log('결제 로그 저장 실패:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderId: tossData.orderId,
          paymentKey: tossData.paymentKey,
          method: tossData.method,
          totalAmount: tossData.totalAmount,
          approvedAt: tossData.approvedAt,
          receipt: tossData.receipt,
          card: tossData.card,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('결제 승인 처리 오류:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '서버 오류가 발생했습니다.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

