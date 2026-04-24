// 추가요금 거절 → 반송(RETURN) 워크플로우 (모바일/웹 공통)
//
// 정책:
//  - extra_charge_status = PENDING_CUSTOMER 인 주문에서만 동작
//  - process_customer_decision RPC 로 상태 전이 (RETURN_REQUESTED, RETURN_PENDING)
//  - Toss /v1/payments/{paymentKey}/cancel 로 부분환불
//  - 환불액 = total_price - returnFee - orders.remote_area_fee (왕복)
//
// 입력:  { order_id: string, reason?: string }
// 출력:  {
//   success: boolean,
//   message: string,
//   returnFee, remoteAreaFee, totalDeduction, refundAmount,
//   refundProcessed, refundError
// }
//
// ※ 웹의 /api/orders/[id]/return-and-refund 라우트와 동일한 로직을 미러링한다.
//   기존 모바일은 process_customer_decision RPC 만 호출하여 환불이 누락되어 있던
//   문제를 해결한다.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_RETURN_FEE = 7000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? ''

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ success: false, error: '로그인이 필요합니다.' }, 401)

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const orderId = String(body?.order_id ?? '').trim()
    if (!orderId) {
      return json({ success: false, error: 'order_id 가 필요합니다.' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 본인 매핑 (public.users.id)
    const userRowRes = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
    const internalUserId = userRowRes.data?.id as string | undefined
    if (!internalUserId) {
      return json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' }, 401)
    }

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select(
        'id, status, payment_status, payment_key, total_price, remote_area_fee, user_id, extra_charge_status, extra_charge_data, item_name, order_number',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return json({ success: false, error: '주문을 찾을 수 없습니다.' }, 404)
    }

    if (order.user_id !== internalUserId) {
      return json({ success: false, error: '본인 주문만 처리할 수 있습니다.' }, 403)
    }

    if (order.extra_charge_status !== 'PENDING_CUSTOMER') {
      return json(
        {
          success: false,
          error: '추가 결제 대기 상태가 아닌 주문입니다.',
          currentStatus: order.extra_charge_status,
        },
        400,
      )
    }

    // 차감액 계산
    const totalPrice = Number(order.total_price ?? 0)
    let returnFee = Number(
      ((order.extra_charge_data as { returnFee?: number } | null) ?? {}).returnFee ?? 0,
    )
    if (!Number.isFinite(returnFee) || returnFee <= 0) {
      try {
        const settingsRes = await admin
          .from('shipping_settings')
          .select('return_shipping_fee')
          .eq('id', 1)
          .maybeSingle()
        const v = Number(settingsRes.data?.return_shipping_fee)
        if (Number.isFinite(v) && v > 0) returnFee = v
      } catch {
        /* 폴백 */
      }
    }
    if (!Number.isFinite(returnFee) || returnFee <= 0) returnFee = DEFAULT_RETURN_FEE

    // 도서산간 차감액: orders.remote_area_fee 컬럼은 결제 시 이미 왕복(편도×2)으로
    // 저장된 값이므로 별도 ×2 없이 그대로 더한다.
    const remoteAreaFee = Math.max(0, Number(order.remote_area_fee ?? 0) || 0)
    const totalDeduction = returnFee + remoteAreaFee
    const refundAmount = Math.max(totalPrice - totalDeduction, 0)

    // 1) RPC 로 상태 전이 (process_customer_decision)
    const { error: rpcErr } = await admin.rpc('process_customer_decision', {
      p_order_id: orderId,
      p_action: 'RETURN',
      p_customer_id: internalUserId,
    })
    if (rpcErr) {
      console.error('process_customer_decision RETURN error:', rpcErr)
      return json(
        { success: false, error: rpcErr.message || '반송 처리 실패' },
        500,
      )
    }

    // 2) Toss 부분환불
    const paymentKey = order.payment_key as string | null
    let refundResult: Record<string, unknown> | null = null
    let refundError: string | null = null

    if (paymentKey && refundAmount > 0) {
      if (!TOSS_SECRET_KEY) {
        refundError = 'TOSS_SECRET_KEY 환경 변수가 설정되지 않았습니다.'
      } else {
        try {
          const tossRes = await fetch(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cancelReason: `반송 처리 - 왕복 배송비 ${returnFee.toLocaleString()}원${
                  remoteAreaFee > 0
                    ? ` + 도서산간 ${remoteAreaFee.toLocaleString()}원`
                    : ''
                } 차감`,
                cancelAmount: refundAmount,
              }),
            },
          )
          const tossData = await tossRes.json()
          if (!tossRes.ok) {
            refundError = tossData?.message || '부분환불 실패'
            console.error('Toss partial cancel failed:', tossData)
          } else {
            refundResult = tossData
            await admin
              .from('orders')
              .update({
                payment_status: 'PARTIAL_CANCELED',
                canceled_at: new Date().toISOString(),
                cancellation_reason: `반송 - 왕복 배송비 ${returnFee}원${
                  remoteAreaFee > 0 ? ` + 도서산간 ${remoteAreaFee}원` : ''
                } 차감`,
              })
              .eq('id', orderId)

            try {
              await admin.from('payment_logs').insert({
                order_id: orderId,
                payment_key: paymentKey,
                amount: refundAmount,
                status: 'PARTIAL_CANCELED',
                provider: 'TOSS',
                response_data: tossData,
              })
            } catch {
              /* 로그 실패 무시 */
            }
          }
        } catch (e) {
          refundError = (e as Error)?.message || String(e)
        }
      }
    } else if (!paymentKey) {
      refundError = '결제 정보(payment_key)가 없어 환불 처리되지 않았습니다.'
    }

    // 3) 관리자 알림 fan-out (입고 후 취소와 동일한 패턴)
    try {
      const { data: managers } = await admin
        .from('users')
        .select('id')
        .in('role', ['ADMIN', 'MANAGER'])

      if (managers && managers.length > 0) {
        const rows = managers.map((m: { id: string }) => ({
          user_id: m.id,
          type: 'ORDER_RETURN_AFTER_EXTRA_CHARGE',
          title: '추가요금 거절 (반송 요청)',
          body: `'${order.item_name ?? '주문'}' (${
            order.order_number ?? orderId.slice(0, 8)
          }) 의 추가요금이 거절되어 반송이 요청되었습니다.`,
          order_id: orderId,
          metadata: {
            orderId,
            orderNumber: order.order_number ?? null,
            returnFee,
            remoteAreaFee,
            totalDeduction,
            refundAmount,
            customer_user_id: order.user_id,
          },
        }))
        await admin.from('notifications').insert(rows)
      }
    } catch (notifyErr) {
      console.warn('admin 알림 fan-out 실패 (무시):', notifyErr)
    }

    const deductionDescParts = [`왕복 배송비 ${returnFee.toLocaleString()}원`]
    if (remoteAreaFee > 0) {
      deductionDescParts.push(`도서산간 ${remoteAreaFee.toLocaleString()}원`)
    }
    const deductionDesc = deductionDescParts.join(' + ')

    return json({
      success: true,
      message: refundResult
        ? `반송 요청 완료. ${deductionDesc} 을(를) 차감하고 ${refundAmount.toLocaleString()}원이 환불됩니다.`
        : `반송 요청 완료. 환불 금액(${refundAmount.toLocaleString()}원)은 별도 처리됩니다.`,
      returnFee,
      remoteAreaFee,
      totalDeduction,
      refundAmount,
      refundProcessed: !!refundResult,
      refundError,
    })
  } catch (e) {
    console.error('orders-return-and-refund 오류:', e)
    return json(
      { success: false, error: (e as Error)?.message || '반송 처리 중 오류가 발생했습니다.' },
      500,
    )
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
