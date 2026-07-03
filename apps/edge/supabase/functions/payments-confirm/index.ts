// 포트원 V2 결제 검증 (결제창 인증결제)
// Toss confirm API 호출 방식 → PortOne GET /payments/{paymentId} 조회 검증 방식으로 변경
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PORTONE_API_SECRET = Deno.env.get('PORTONE_API_SECRET') || ''
const PORTONE_API_URL = 'https://api.portone.io'

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
      payment_id,
      order_id,
      amount: rawAmount,
      is_extra_charge = false,
      original_order_id,
      pickup_payload,
    } = await req.json()

    // amount는 isCreateOrderFlow(신규 intent 기반 결제)에서 선택적
    // 이 경우 payment_intents.total_price가 권위적 금액으로 사용됨
    let amount: number | undefined = rawAmount ? Number(rawAmount) : undefined

    if (!payment_id || !order_id) {
      throw new Error('필수 파라미터가 누락되었습니다. (payment_id, order_id)')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 신규 흐름: pickup_payload 가 동봉되면 결제 후 orders INSERT
    const isCreateOrderFlow = !is_extra_charge && pickup_payload && typeof pickup_payload === 'object'

    let originalAmount: number | null = null
    let orderData: any = null

    if (is_extra_charge && original_order_id) {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, extra_charge_status, extra_charge_data, user_id, order_number, item_name')
        .eq('id', original_order_id)
        .single()

      if (error || !data) throw new Error('주문 정보를 찾을 수 없습니다.')
      if (data.extra_charge_status !== 'PENDING_CUSTOMER') {
        throw new Error('추가 결제 대기 상태가 아닙니다.')
      }

      const extraChargeData = data.extra_charge_data || {}
      originalAmount = extraChargeData.manager_price || extraChargeData.managerPrice
      if (!originalAmount) throw new Error('추가 결제 금액 정보를 찾을 수 없습니다.')
      orderData = data

    } else if (is_extra_charge) {
      const { data, error } = await supabaseClient
        .from('extra_charge_requests')
        .select('*')
        .eq('id', order_id)
        .single()

      if (error || !data) throw new Error('추가 결제 요청을 찾을 수 없습니다.')
      originalAmount = data.amount
      orderData = data

    } else if (isCreateOrderFlow) {
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      const m = (typeof order_id === 'string' ? order_id : '').match(UUID_RE)
      const intentId = m ? m[0] : null
      if (!intentId) throw new Error('order_id 가 UUID(intent_id) 형식이어야 합니다.')

      const { data: intent, error: intentErr } = await supabaseClient
        .from('payment_intents')
        .select('id, user_id, total_price, payload, expires_at, consumed_at, consumed_order_id')
        .eq('id', intentId)
        .maybeSingle()

      if (intentErr || !intent) throw new Error('결제 인텐트를 찾을 수 없습니다.')

      if (intent.consumed_at && intent.consumed_order_id) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              orderId: intent.consumed_order_id,
              paymentId: payment_id,
              totalAmount: amount,
              idempotent: true,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (new Date(intent.expires_at).getTime() < Date.now()) {
        throw new Error('결제 인텐트가 만료되었습니다. 다시 시도해주세요.')
      }

      originalAmount = intent.total_price
      // 클라이언트가 amount를 전달하지 않은 경우 intent.total_price로 채움
      // (isCreateOrderFlow에서 서버가 권위적 금액을 보유하므로 안전)
      if (!amount) amount = originalAmount
      orderData = {
        _pending_insert: true,
        _intent_id: intentId,
        _intent_user_id: intent.user_id,
        _pickup: intent.payload,
      }

    } else {
      // 레거시 흐름: 기존 orders 조회
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      let lookupId: string | null = null
      if (typeof original_order_id === 'string' && UUID_RE.test(original_order_id)) {
        lookupId = original_order_id.match(UUID_RE)![0]
      } else if (typeof order_id === 'string' && UUID_RE.test(order_id)) {
        lookupId = order_id.match(UUID_RE)![0]
      }
      if (!lookupId) throw new Error('주문 ID 형식이 올바르지 않습니다. (UUID 필요)')

      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, total_price, payment_status, payment_id, user_id')
        .eq('id', lookupId)
        .single()

      if (error || !data) throw new Error('주문 정보를 찾을 수 없습니다.')

      if (data.payment_status === 'PAID') {
        if (data.payment_id && data.payment_id === payment_id) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                orderId: order_id,
                paymentId: payment_id,
                totalAmount: amount,
                idempotent: true,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw new Error('이미 결제가 완료된 주문입니다.')
      }

      originalAmount = data.total_price
      orderData = { ...data, _resolved_id: lookupId }
    }

    // 금액 사전 검증
    if (originalAmount && originalAmount !== amount) {
      throw new Error(`결제 금액이 일치하지 않습니다. 주문금액: ${originalAmount}원, 요청금액: ${amount}원`)
    }

    // ── 포트원 V2: 결제 단건 조회로 검증 (별도 confirm API 없음) ──
    const portoneRes = await fetch(
      `${PORTONE_API_URL}/payments/${encodeURIComponent(payment_id)}`,
      { headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` } }
    )
    const portoneData = await portoneRes.json()

    if (!portoneRes.ok) {
      console.error('포트원 결제 조회 실패:', portoneData)
      throw new Error(portoneData.message || '결제 조회에 실패했습니다.')
    }

    if (portoneData.status !== 'PAID') {
      throw new Error(`결제가 완료되지 않았습니다. (status: ${portoneData.status})`)
    }

    if (portoneData.amount?.total !== amount) {
      throw new Error(
        `결제 금액이 일치하지 않습니다. 포트원: ${portoneData.amount?.total}원, 요청: ${amount}원`
      )
    }

    const paidAt = portoneData.paidAt || portoneData.approvedAt || new Date().toISOString()
    const payMethod = portoneData.method?.type || 'CARD'

    console.log('✅ 포트원 결제 검증 성공:', order_id)

    // ── DB 업데이트 ──
    if (is_extra_charge && original_order_id) {
      const updatedExtraChargeData = {
        ...(orderData.extra_charge_data || {}),
        customer_paid_at: paidAt,
        payment_id: payment_id,
        paid_amount: amount,
      }

      await supabaseClient
        .from('orders')
        .update({
          extra_charge_status: 'COMPLETED',
          extra_charge_data: updatedExtraChargeData,
        })
        .eq('id', original_order_id)

      console.log('✅ 추가 결제 완료 - extra_charge_status: COMPLETED')

      try {
        const { data: managers } = await supabaseClient
          .from('users')
          .select('id')
          .in('role', ['MANAGER', 'ADMIN'])

        if (managers && managers.length > 0) {
          const notifications = managers.map((manager: any) => ({
            user_id: manager.id,
            type: 'extra_charge_status_changed',
            title: '추가 결제 완료',
            body: `주문(${orderData.order_number || original_order_id})의 추가 결제가 완료되었습니다. 작업을 재개해주세요.`,
            order_id: original_order_id,
            metadata: { extra_charge_status: 'COMPLETED', amount, payment_id },
          }))
          await supabaseClient.from('notifications').insert(notifications)
        }
      } catch (e) {
        console.log('알림 전송 실패 (무시):', e)
      }

    } else if (is_extra_charge) {
      await supabaseClient
        .from('extra_charge_requests')
        .update({
          status: 'PAID',
          payment_id: payment_id,
          customer_response_at: paidAt,
        })
        .eq('id', order_id)

      if (orderData?.worker_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.worker_id,
          type: 'EXTRA_CHARGE_RESPONSE',
          title: '추가 비용 결제 완료',
          body: `고객이 추가 비용 ${amount.toLocaleString()}원을 결제했습니다.`,
          metadata: { requestId: order_id, orderId: orderData.order_id, paymentId: payment_id },
        })
      }

    } else if (isCreateOrderFlow) {
      const pickup = (orderData as any)._pickup as Record<string, any>
      const internalUserId = (orderData as any)._intent_user_id as string
      const intentId = (orderData as any)._intent_id as string

      const orderNumber = `ORD${Date.now()}`
      const insertData: Record<string, any> = {
        user_id: internalUserId,
        status: 'PAID',
        payment_status: 'PAID',
        payment_id: payment_id,
        paid_at: paidAt,
        order_number: orderNumber,
        item_name: pickup.itemName,
        clothing_type: pickup.clothingType || '기타',
        repair_type: pickup.repairType || '기타',
        pickup_address: pickup.pickupAddress,
        pickup_address_detail: pickup.pickupAddressDetail || null,
        pickup_zipcode: pickup.pickupZipcode || null,
        pickup_phone: pickup.pickupPhone || '010-0000-0000',
        pickup_date: pickup.pickupDate || null,
        delivery_address: pickup.deliveryAddress || pickup.pickupAddress,
        delivery_address_detail: pickup.deliveryAddressDetail || pickup.pickupAddressDetail || null,
        delivery_zipcode: pickup.deliveryZipcode || pickup.pickupZipcode || null,
        delivery_phone: pickup.deliveryPhone || pickup.pickupPhone || '010-0000-0000',
        customer_name: pickup.customerName || '고객',
        customer_phone: pickup.customerPhone || pickup.pickupPhone || '010-0000-0000',
        customer_email: pickup.customerEmail || null,
        notes: pickup.notes || null,
        base_price: pickup.basePrice ?? null,
        total_price: amount,
        shipping_fee: pickup.shippingFee ?? null,
        shipping_discount_amount: pickup.shippingDiscountAmount ?? 0,
        shipping_promotion_id: pickup.shippingPromotionId || null,
        remote_area_fee: pickup.remoteAreaFee ?? 0,
        promotion_code_id: pickup.promotionCodeId || null,
        promotion_discount_amount: pickup.promotionDiscountAmount ?? null,
        original_total_price: pickup.originalTotalPrice ?? null,
        repair_parts: Array.isArray(pickup.repairParts) && pickup.repairParts.length > 0 ? pickup.repairParts : null,
        images_with_pins: Array.isArray(pickup.imagesWithPins) && pickup.imagesWithPins.length > 0 ? pickup.imagesWithPins : null,
        images: Array.isArray(pickup.imageUrls) && pickup.imageUrls.length > 0 ? { urls: pickup.imageUrls } : null,
      }

      let attempt = 0
      let inserted: any = null
      let lastErr: any = null
      while (attempt < 12) {
        const r = await supabaseClient.from('orders').insert(insertData).select('id').single()
        if (!r.error) { inserted = r.data; break }
        lastErr = r.error
        const msg = r.error.message || ''
        const cm = msg.match(/Could not find the '(.+?)' column/) || msg.match(/column "(.+?)" of relation/)
        if (r.error.code === 'PGRST204' && cm?.[1]) {
          delete insertData[cm[1]]
          attempt++
          continue
        }
        break
      }
      if (!inserted) {
        console.error('주문 insert 실패:', lastErr)

        // 관리자에게 즉시 알림 발송 (결제는 성공했지만 주문 생성이 실패한 위험 상황)
        try {
          const { data: admins } = await supabaseClient
            .from('users')
            .select('id')
            .in('role', ['ADMIN', 'MANAGER'])
          if (admins && admins.length > 0) {
            await supabaseClient.from('notifications').insert(
              admins.map((a: { id: string }) => ({
                user_id: a.id,
                type: 'ORDER_CREATE_FAILED',
                title: '⚠️ 결제 후 주문 생성 실패',
                body: `결제 ${payment_id}는 성공했으나 주문 저장에 실패했습니다. payment_intents ID: ${intentId}`,
                metadata: {
                  payment_id,
                  intent_id: intentId,
                  amount,
                  error: lastErr?.message,
                },
              }))
            )
          }
        } catch (notifyErr) {
          console.error('관리자 알림 발송 실패(무시):', notifyErr)
        }

        throw new Error('결제는 검증되었으나 주문 저장에 실패했습니다. 관리자에게 문의해주세요.')
      }

      const newOrderId = (inserted as any).id as string

      try {
        await supabaseClient
          .from('payment_intents')
          .update({ consumed_at: new Date().toISOString(), consumed_order_id: newOrderId })
          .eq('id', intentId)
      } catch (e) {
        console.log('intent consume 마킹 실패(무시):', e)
      }

      try {
        await supabaseClient.from('notifications').insert({
          user_id: internalUserId,
          type: 'PAYMENT_COMPLETED',
          title: '결제 완료',
          body: `${amount.toLocaleString()}원 결제가 완료되었습니다.`,
          order_id: newOrderId,
        })
      } catch (e) {
        console.log('알림 전송 실패(무시):', e)
      }

      orderData._resolved_id = newOrderId
      orderData.user_id = internalUserId
      console.log('✅ 신규 흐름: 결제 후 주문 생성 완료', newOrderId)

    } else {
      // 레거시 흐름
      const ordersId = orderData?._resolved_id || order_id
      await supabaseClient
        .from('orders')
        .update({
          status: 'PAID',
          payment_status: 'PAID',
          payment_id: payment_id,
          paid_at: paidAt,
        })
        .eq('id', ordersId)

      if (orderData?.user_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.user_id,
          type: 'PAYMENT_COMPLETED',
          title: '결제 완료',
          body: `${amount.toLocaleString()}원 결제가 완료되었습니다.`,
          order_id: ordersId,
        })
      }
    }

    // 결제 로그
    try {
      const logOrderId = is_extra_charge && original_order_id
        ? original_order_id
        : (is_extra_charge ? (orderData?.order_id || null) : (orderData?._resolved_id || order_id))

      await supabaseClient.from('payment_logs').insert({
        order_id: logOrderId,
        payment_id: payment_id,
        amount: portoneData.amount?.total,
        method: payMethod,
        status: 'SUCCESS',
        provider: 'PORTONE',
        is_extra_charge: !!is_extra_charge,
        response_data: portoneData,
        approved_at: paidAt,
      })
    } catch (e) {
      console.log('결제 로그 저장 실패:', e)
    }

    const responseOrderId = (orderData && (orderData as any)._resolved_id) || order_id

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderId: responseOrderId,
          paymentId: payment_id,
          method: payMethod,
          totalAmount: portoneData.amount?.total,
          approvedAt: paidAt,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('결제 검증 처리 오류:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || '서버 오류가 발생했습니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
