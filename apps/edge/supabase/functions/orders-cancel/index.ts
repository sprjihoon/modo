// 주문 취소 (모바일/웹 공통)
//
// 정책:
//  - PENDING / PAID / BOOKED       → 수거 전: 우체국 수거 취소 + 전액 환불
//  - PICKED_UP / INBOUND           → 수거 이후: 부분 환불(왕복 배송비 차감) + 반송 워크플로우
//  - 그 외                          → 직접 취소 불가
//
// 입력: { order_id: string, reason?: string }
// 출력: {
//   success: boolean,
//   flow: 'PRE_PICKUP_CANCEL' | 'POST_PICKUP_RETURN',
//   message: string,
//   ...flow별 추가 필드
// }
//
// ※ 웹의 /api/orders/[id]/cancel 라우트와 동일한 로직을 미러링한다.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAID_STATUSES = new Set(['PAID', 'COMPLETED', 'DONE'])
// PENDING_PAYMENT 는 폐지된 상태이지만, 옛 모바일 빌드가 만든 좀비 row 가 들어오면
// 사용자가 직접 정리할 수 있게 PRE_PICKUP 으로 받아준다.
const PRE_PICKUP_STATUSES = new Set(['PENDING', 'PAID', 'BOOKED', 'PENDING_PAYMENT'])
const POST_PICKUP_STATUSES = new Set(['PICKED_UP', 'INBOUND'])

const DEFAULT_RETURN_SHIPPING_FEE = 7000

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

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const orderId = String(body?.order_id ?? '').trim()
    const reason = (body?.reason as string | undefined) ?? undefined

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

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select(
        'id, status, payment_status, payment_key, total_price, remote_area_fee, user_id, extra_charge_status, extra_charge_data, item_name, order_number, tracking_no',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return json({ success: false, error: '주문을 찾을 수 없습니다.' }, 404)
    }

    const ownerIds = [internalUserId, user.id].filter(Boolean) as string[]
    if (!ownerIds.includes(order.user_id as string)) {
      return json({ success: false, error: '본인 주문만 취소할 수 있습니다.' }, 403)
    }

    if (order.status === 'CANCELLED') {
      return json({ success: true, alreadyCancelled: true })
    }

    const isPostPickup = POST_PICKUP_STATUSES.has(order.status as string)
    const isPrePickup = PRE_PICKUP_STATUSES.has(order.status as string)

    if (!isPrePickup && !isPostPickup) {
      return json(
        {
          success: false,
          code: 'NOT_SELF_CANCELLABLE',
          error: '현재 상태에서는 직접 취소가 불가능합니다. 고객센터로 문의해 주세요.',
        },
        409,
      )
    }

    const paymentKey = order.payment_key as string | null
    const paymentStatus = order.payment_status as string | null
    const totalPrice = Number(order.total_price ?? 0)
    const hasValidPayment = !!paymentKey && PAID_STATUSES.has(paymentStatus ?? '')

    // ───────────────────────────────────────────────
    // ① 수거 이후 취소 (PICKED_UP / INBOUND)
    // ───────────────────────────────────────────────
    if (isPostPickup) {
      // 관리자 페이지에 설정된 왕복 배송비
      let returnFee = DEFAULT_RETURN_SHIPPING_FEE
      try {
        const settingsRes = await admin
          .from('shipping_settings')
          .select('return_shipping_fee')
          .eq('id', 1)
          .maybeSingle()
        const v = Number(settingsRes.data?.return_shipping_fee)
        if (Number.isFinite(v)) returnFee = Math.max(0, v)
      } catch {
        /* 폴백 */
      }
      // 도서산간 차감액: orders.remote_area_fee 컬럼은 결제 시 이미 왕복(편도×2)으로
      // 저장된 값이므로 별도 ×2 없이 그대로 더한다.
      // (저장 위치: web/lib/order-pricing.ts, edge/orders-quote/index.ts 에서 ×2 처리)
      const remoteAreaFee = Math.max(0, Number(order.remote_area_fee ?? 0) || 0)
      const totalDeduction = returnFee + remoteAreaFee
      const refundAmount = Math.max(totalPrice - totalDeduction, 0)

      let refundResult: Record<string, unknown> | null = null
      let refundError: string | null = null

      if (hasValidPayment && refundAmount > 0) {
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
                  cancelReason:
                    reason ||
                    `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee.toLocaleString()}원${
                      remoteAreaFee > 0
                        ? ` + 도서산간 ${remoteAreaFee.toLocaleString()}원`
                        : ''
                    } 차감)`,
                  cancelAmount: refundAmount,
                }),
              },
            )
            const tossData = await tossRes.json()
            if (!tossRes.ok) {
              refundError = tossData?.message || '부분환불 실패'
            } else {
              refundResult = tossData
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
                /* log table 미존재 시 무시 */
              }
            }
          } catch (e) {
            refundError = (e as Error)?.message || String(e)
          }
        }
      } else if (!hasValidPayment) {
        refundError = '결제 정보가 없어 환불 처리되지 않았습니다.'
      }

      // 환불 성공 또는 환불 금액 0일 때만 상태 전이.
      const refundOk = !!refundResult || refundAmount === 0
      if (refundOk) {
        const existingExtraData =
          (order.extra_charge_data as Record<string, unknown> | null) ?? {}
        const updatedExtraData = {
          ...existingExtraData,
          customerAction: 'USER_CANCEL_AFTER_PICKUP',
          returnFee,
          remoteAreaFee,
          totalDeduction,
          refundAmount,
          cancelRequestedAt: new Date().toISOString(),
          cancelReason: reason || '고객 요청 - 입고 후 취소',
        }

        await admin
          .from('orders')
          .update({
            status: 'RETURN_PENDING',
            payment_status: refundResult ? 'PARTIAL_CANCELED' : paymentStatus,
            extra_charge_status: 'RETURN_REQUESTED',
            extra_charge_data: updatedExtraData,
            canceled_at: new Date().toISOString(),
            cancellation_reason:
              reason ||
              `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee}원${
                remoteAreaFee > 0 ? ` + 도서산간 ${remoteAreaFee}원` : ''
              } 차감)`,
          })
          .eq('id', orderId)

        // 관리자(MANAGER/ADMIN)들에게 알림 fan-out
        try {
          const { data: managers } = await admin
            .from('users')
            .select('id')
            .in('role', ['ADMIN', 'MANAGER'])

          if (managers && managers.length > 0) {
            const rows = managers.map((m: { id: string }) => ({
              user_id: m.id,
              type: 'ORDER_CANCEL_AFTER_PICKUP',
              title: '입고 후 취소 요청',
              body: `'${order.item_name ?? '주문'}' (${
                order.order_number ?? orderId.slice(0, 8)
              }) 의 취소가 요청되었습니다. 반송 송장을 발급해 주세요.`,
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
      }

      const deductionDescParts = [`왕복 배송비 ${returnFee.toLocaleString()}원`]
      if (remoteAreaFee > 0) {
        deductionDescParts.push(`도서산간 ${remoteAreaFee.toLocaleString()}원`)
      }
      const deductionDesc = deductionDescParts.join(' + ')

      return json({
        success: true,
        flow: 'POST_PICKUP_RETURN',
        message: refundResult
          ? `취소 요청이 접수되었습니다. ${deductionDesc} 을(를) 차감한 ${refundAmount.toLocaleString()}원이 환불됩니다.`
          : refundAmount === 0
            ? '취소 요청이 접수되었습니다.'
            : `취소 요청이 접수되었으나 환불 처리에 실패했습니다.${
                refundError ? ` (${refundError})` : ''
              } 고객센터로 문의해 주세요.`,
        returnFee,
        remoteAreaFee,
        totalDeduction,
        refundAmount,
        refundProcessed: !!refundResult,
        refundError,
        hasValidPayment,
        shipmentCanceled: false,
        paymentCanceled: !!refundResult,
        paymentCancelError: refundError,
      })
    }

    // ───────────────────────────────────────────────
    // ② 수거 전 취소 (PENDING / PAID / BOOKED / PENDING_PAYMENT)
    // ───────────────────────────────────────────────

    // 1) 우체국 수거 취소 — tracking_no 가 있을 때만 시도.
    //    송장 자체가 없는 경우(좀비 PENDING_PAYMENT, 결제 전 PENDING 등)는 호출 자체를 스킵.
    //    호출하더라도 shipments-cancel 이 404 (SHIPMENT_NOT_FOUND) 를 주면
    //    "취소할 게 없음 = 정상" 으로 간주하고 다음 단계로 진행한다.
    const orderTrackingNo = (order as { tracking_no: string | null }).tracking_no
    let shipmentResult: Record<string, unknown> = {}
    let shipmentCanceled = false

    if (orderTrackingNo) {
      const shipmentRes = await fetch(`${SUPABASE_URL}/functions/v1/shipments-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
      })
      shipmentResult = await shipmentRes.json().catch(() => ({}))

      if (shipmentRes.ok) {
        shipmentCanceled = true
      } else {
        const code = (shipmentResult as { code?: string })?.code
        const errMsg = (shipmentResult as { error?: string })?.error ?? ''
        const isNoShipment =
          code === 'SHIPMENT_NOT_FOUND' ||
          shipmentRes.status === 404 ||
          /Shipment not found/i.test(errMsg)
        if (!isNoShipment) {
          return json(
            {
              success: false,
              error: errMsg || '수거 취소에 실패했습니다.',
              step: 'shipment',
            },
            500,
          )
        }
        console.log(`[orders-cancel] shipment 없음 — 우체국 취소 스킵 (orderId=${orderId})`)
      }
    } else {
      console.log(`[orders-cancel] tracking_no 없음 — 우체국 취소 스킵 (orderId=${orderId})`)
    }

    // 2) 카드 결제 취소 (있을 때만)
    let paymentCancelResult: Record<string, unknown> | null = null
    let paymentCancelError: string | null = null

    if (hasValidPayment) {
      if (!TOSS_SECRET_KEY) {
        paymentCancelError = 'TOSS_SECRET_KEY 환경 변수가 설정되지 않았습니다.'
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
                cancelReason: reason || '고객 요청 - 수거 예약 취소',
              }),
            },
          )
          const tossData = await tossRes.json()
          if (!tossRes.ok) {
            paymentCancelError = tossData?.message || '카드 취소 실패'
          } else {
            paymentCancelResult = tossData
            await admin
              .from('orders')
              .update({
                status: 'CANCELLED',
                payment_status: 'CANCELED',
                canceled_at: new Date().toISOString(),
                cancellation_reason: reason || '고객 요청 - 수거 예약 취소',
              })
              .eq('id', orderId)

            try {
              await admin.from('payment_logs').insert({
                order_id: orderId,
                payment_key: paymentKey,
                amount: totalPrice || tossData.totalAmount,
                status: 'CANCELED',
                provider: 'TOSS',
                response_data: tossData,
              })
            } catch {
              /* log table 미존재 시 무시 */
            }
          }
        } catch (e) {
          paymentCancelError = (e as Error)?.message || String(e)
        }
      }
    } else {
      await admin
        .from('orders')
        .update({
          status: 'CANCELLED',
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || '고객 요청 - 수거 예약 취소',
        })
        .eq('id', orderId)
    }

    return json({
      success: true,
      flow: 'PRE_PICKUP_CANCEL',
      message:
        (shipmentResult as { message?: string })?.message || '수거 예약이 취소되었습니다.',
      shipmentCanceled,
      paymentCanceled: !!paymentCancelResult,
      paymentCancelError,
      hasValidPayment,
      epost_result: (shipmentResult as { epost_result?: unknown })?.epost_result,
    })
  } catch (e) {
    console.error('orders-cancel 오류:', e)
    return json(
      { success: false, error: (e as Error)?.message || '취소 중 오류가 발생했습니다.' },
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
