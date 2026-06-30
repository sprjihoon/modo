import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAID_STATUSES = new Set(['PAID', 'COMPLETED', 'DONE'])
const PRE_PICKUP_STATUSES = new Set(['PENDING', 'PAID', 'BOOKED', 'PENDING_PAYMENT'])
const POST_PICKUP_STATUSES = new Set(['PICKED_UP', 'INBOUND'])
const DEFAULT_RETURN_SHIPPING_FEE = 7000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET') ?? ''

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

    if (!orderId) return json({ success: false, error: 'order_id 가 필요합니다.' }, 400)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const userRowRes = await admin.from('users').select('id').eq('auth_id', user.id).maybeSingle()
    const internalUserId = userRowRes.data?.id as string | undefined

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status, payment_status, payment_id, payment_key, total_price, remote_area_fee, user_id, extra_charge_status, extra_charge_data, item_name, order_number, tracking_no')
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) return json({ success: false, error: '주문을 찾을 수 없습니다.' }, 404)

    const ownerIds = [internalUserId, user.id].filter(Boolean) as string[]
    if (!ownerIds.includes(order.user_id as string)) {
      return json({ success: false, error: '본인 주문만 취소할 수 있습니다.' }, 403)
    }

    if (order.status === 'CANCELLED') return json({ success: true, alreadyCancelled: true })

    const isPostPickup = POST_PICKUP_STATUSES.has(order.status as string)
    const isPrePickup = PRE_PICKUP_STATUSES.has(order.status as string)

    if (!isPrePickup && !isPostPickup) {
      return json({ success: false, code: 'NOT_SELF_CANCELLABLE', error: '현재 상태에서는 직접 취소가 불가능합니다. 고객센터로 문의해 주세요.' }, 409)
    }

    const paymentId = ((order as any).payment_id ?? (order as any).payment_key) as string | null
    const paymentStatus = order.payment_status as string | null
    const totalPrice = Number(order.total_price ?? 0)
    const hasValidPayment = !!paymentId && PAID_STATUSES.has(paymentStatus ?? '')

    // ── 수거 이후 취소 (PICKED_UP / INBOUND) ──
    if (isPostPickup) {
      let returnFee = DEFAULT_RETURN_SHIPPING_FEE
      try {
        const settingsRes = await admin.from('shipping_settings').select('return_shipping_fee').eq('id', 1).maybeSingle()
        const v = Number(settingsRes.data?.return_shipping_fee)
        if (Number.isFinite(v)) returnFee = Math.max(0, v)
      } catch { /* fallback */ }

      const remoteAreaFee = Math.max(0, Number(order.remote_area_fee ?? 0) || 0)
      const totalDeduction = returnFee + remoteAreaFee
      const refundAmount = Math.max(totalPrice - totalDeduction, 0)

      let refundResult: Record<string, unknown> | null = null
      let refundError: string | null = null

      if (hasValidPayment && refundAmount > 0) {
        if (!PORTONE_API_SECRET) {
          refundError = 'PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다.'
        } else {
          try {
            const portoneRes = await fetch(
              `https://api.portone.io/payments/${encodeURIComponent(paymentId!)}/cancel`,
              {
                method: 'POST',
                headers: { Authorization: `PortOne ${PORTONE_API_SECRET}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reason: reason || `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee.toLocaleString()}원${remoteAreaFee > 0 ? ` + 도서산간 ${remoteAreaFee.toLocaleString()}원` : ''} 차감)`,
                  amount: refundAmount,
                }),
              },
            )
            const portoneData = await portoneRes.json()
            if (!portoneRes.ok) {
              refundError = portoneData?.message || '부분환불 실패'
            } else {
              refundResult = portoneData
              try {
                await admin.from('payment_logs').insert({
                  order_id: orderId,
                  payment_id: paymentId,
                  amount: refundAmount,
                  status: 'PARTIAL_CANCELED',
                  provider: 'PORTONE',
                  response_data: portoneData,
                })
              } catch { /* log table 미존재 시 무시 */ }
            }
          } catch (e) {
            refundError = (e as Error)?.message || String(e)
          }
        }
      } else if (!hasValidPayment) {
        refundError = '결제 정보가 없어 환불 처리되지 않았습니다.'
      }

      const refundOk = !!refundResult || refundAmount === 0
      if (refundOk) {
        const existingExtraData = (order.extra_charge_data as Record<string, unknown> | null) ?? {}
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

        await admin.from('orders').update({
          status: 'RETURN_PENDING',
          payment_status: refundResult ? 'PARTIAL_CANCELED' : paymentStatus,
          extra_charge_status: 'RETURN_REQUESTED',
          extra_charge_data: updatedExtraData,
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason || `고객 요청 - 입고 후 취소 (왕복 배송비 ${returnFee}원${remoteAreaFee > 0 ? ` + 도서산간 ${remoteAreaFee}원` : ''} 차감)`,
        }).eq('id', orderId)

        try {
          const { data: managers } = await admin.from('users').select('id').in('role', ['ADMIN', 'MANAGER'])
          if (managers && managers.length > 0) {
            const rows = managers.map((m: { id: string }) => ({
              user_id: m.id,
              type: 'ORDER_CANCEL_AFTER_PICKUP',
              title: '입고 후 취소 요청',
              body: `'${(order as any).item_name ?? ''}' 의 취소가 요청되었습니다. 반송 송장을 발급해 주세요.`,
              order_id: orderId,
              metadata: { orderId, returnFee, remoteAreaFee, totalDeduction, refundAmount, customer_user_id: order.user_id },
            }))
            await admin.from('notifications').insert(rows)
          }
        } catch (e) { console.warn('알림 fan-out 실패:', e) }
      }

      const deductionDesc = remoteAreaFee > 0
        ? `왕복 배송비 ${returnFee.toLocaleString()}원 + 도서산간 ${remoteAreaFee.toLocaleString()}원`
        : `왕복 배송비 ${returnFee.toLocaleString()}원`

      return json({
        success: true,
        flow: 'POST_PICKUP_RETURN',
        message: refundResult
          ? `취소 요청이 접수되었습니다. ${deductionDesc}을(를) 차감한 ${refundAmount.toLocaleString()}원이 환불됩니다.`
          : refundAmount === 0 ? '취소 요청이 정상 접수되었습니다.' : `환불 처리 실패. ${refundError ?? ''}`,
        returnFee,
        remoteAreaFee,
        totalDeduction,
        refundAmount,
        refundProcessed: !!refundResult,
        refundError,
        shipmentCanceled: false,
        paymentCanceled: !!refundResult,
        paymentCancelError: refundError,
      })
    }

    // ── 수거 전 취소 (PENDING / PAID / BOOKED) ──
    const orderTrackingNo = (order as any).tracking_no as string | null
    let shipmentResult: Record<string, unknown> = {}
    let shipmentCanceled = false

    if (orderTrackingNo) {
      const shipmentRes = await fetch(
        `${SUPABASE_URL}/functions/v1/shipments-cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ order_id: orderId, delete_after_cancel: false }),
        }
      )
      shipmentResult = await shipmentRes.json().catch(() => ({}))
      if (shipmentRes.ok) {
        shipmentCanceled = true
      } else {
        const code = (shipmentResult as any)?.code
        const errMsg = (shipmentResult as any)?.error ?? ''
        const isNoShipment = code === 'SHIPMENT_NOT_FOUND' || shipmentRes.status === 404 || /Shipment not found/i.test(errMsg)
        if (!isNoShipment) {
          return json({ success: false, error: errMsg || '수거 취소에 실패했습니다.', step: 'shipment' }, 500)
        }
        console.log(`[orders-cancel] shipment 없음 - 우체국 취소 스킵 (orderId=${orderId})`)
      }
    }

    let paymentCancelResult: Record<string, unknown> | null = null
    let paymentCancelError: string | null = null

    if (hasValidPayment) {
      if (!PORTONE_API_SECRET) {
        paymentCancelError = 'PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다.'
      } else {
        try {
          const portoneRes = await fetch(
            `https://api.portone.io/payments/${encodeURIComponent(paymentId!)}/cancel`,
            {
              method: 'POST',
              headers: { Authorization: `PortOne ${PORTONE_API_SECRET}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: reason || '고객 요청 - 수거 예약 취소' }),
            },
          )
          const portoneData = await portoneRes.json()
          if (!portoneRes.ok) {
            paymentCancelError = portoneData?.message || '카드 취소 실패'
          } else {
            paymentCancelResult = portoneData
            await admin.from('orders').update({
              status: 'CANCELLED',
              payment_status: 'CANCELED',
              canceled_at: new Date().toISOString(),
              cancellation_reason: reason || '고객 요청 - 수거 예약 취소',
            }).eq('id', orderId)

            try {
              await admin.from('payment_logs').insert({
                order_id: orderId,
                payment_id: paymentId,
                amount: totalPrice,
                status: 'CANCELED',
                provider: 'PORTONE',
                response_data: portoneData,
              })
            } catch { /* log table 미존재 시 무시 */ }
          }
        } catch (e) {
          paymentCancelError = (e as Error)?.message || String(e)
        }
      }
    } else {
      await admin.from('orders').update({
        status: 'CANCELLED',
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason || '고객 요청 - 수거 예약 취소',
      }).eq('id', orderId)
    }

    try {
      const { data: managers } = await admin.from('users').select('id').in('role', ['ADMIN', 'MANAGER', 'SUPER_ADMIN'])
      if (managers && managers.length > 0) {
        const rows = managers.map((m: { id: string }) => ({
          user_id: m.id,
          type: 'ORDER_PRE_PICKUP_CANCEL',
          title: '수거 전 주문 취소',
          body: `주문이 고객 요청으로 취소되었습니다.${paymentCancelResult ? ' (결제 환불 완료)' : ''}${paymentCancelError ? ` 환불 실패: ${paymentCancelError}` : ''}`,
          order_id: orderId,
          metadata: { orderId, shipmentCanceled, paymentCanceled: !!paymentCancelResult, paymentCancelError, hasValidPayment, customer_user_id: order.user_id },
        }))
        await admin.from('notifications').insert(rows)
      }
    } catch (e) { console.warn('알림 fan-out 실패:', e) }

    return json({
      success: true,
      flow: 'PRE_PICKUP_CANCEL',
      message: (shipmentResult as any)?.message || '수거 예약이 취소되었습니다.',
      shipmentCanceled,
      paymentCanceled: !!paymentCancelResult,
      paymentCancelError,
      hasValidPayment,
      noRefundRequired: !hasValidPayment,
    })
  } catch (error) {
    console.error('주문 취소 오류:', error)
    return json({ success: false, error: (error as Error).message || '취소 중 오류가 발생했습니다.' }, 500)
  }
})
