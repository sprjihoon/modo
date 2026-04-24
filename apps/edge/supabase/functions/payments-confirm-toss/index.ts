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
      original_order_id, // 추가 결제 시 원본 주문 ID
      // 신규 흐름: 결제 성공 시점에 주문 생성 (PENDING_PAYMENT 폐지)
      //   pickup_payload 가 있으면 결제 승인 후 orders insert.
      //   user_auth_id 는 어떤 사용자의 주문인지 식별용 (서비스롤로 매핑 처리).
      pickup_payload,
      user_auth_id,
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

    // 신규 흐름 여부: pickup_payload 가 동봉되었는지로 판단
    const isCreateOrderFlow = !is_extra_charge && pickup_payload && typeof pickup_payload === 'object'

    // 주문 정보 조회 및 금액 검증
    let originalAmount: number | null = null
    let orderData: any = null

    if (is_extra_charge && original_order_id) {
      // 추가 비용 결제인 경우 orders 테이블의 extra_charge_data에서 금액 조회
      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, extra_charge_status, extra_charge_data, user_id, order_number, item_name')
        .eq('id', original_order_id)
        .single()

      if (error || !data) {
        throw new Error('주문 정보를 찾을 수 없습니다.')
      }

      // 추가 결제 대기 상태인지 확인
      if (data.extra_charge_status !== 'PENDING_CUSTOMER') {
        throw new Error('추가 결제 대기 상태가 아닙니다.')
      }

      // extra_charge_data에서 관리자가 지정한 금액 조회
      const extraChargeData = data.extra_charge_data || {}
      originalAmount = extraChargeData.manager_price || extraChargeData.managerPrice
      
      if (!originalAmount) {
        throw new Error('추가 결제 금액 정보를 찾을 수 없습니다.')
      }

      orderData = data
    } else if (is_extra_charge) {
      // original_order_id 없이 is_extra_charge만 있는 경우 (기존 호환)
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
    } else if (isCreateOrderFlow) {
      // 🆕 신규 흐름: 결제 성공 시점에 orders insert
      //   - order_id 는 payment_intents.id (UUID) — 클라이언트가 quote 결과로 받은 intent_id.
      //   - 인텐트의 권위적 가격(total_price)과 amount 가 일치해야 위변조 없음.
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      const m = (typeof order_id === 'string' ? order_id : '').match(UUID_RE)
      const intentId = m ? m[0] : null
      if (!intentId) {
        throw new Error('order_id 가 UUID(intent_id) 형식이어야 합니다.')
      }

      const { data: intent, error: intentErr } = await supabaseClient
        .from('payment_intents')
        .select('id, user_id, total_price, payload, expires_at, consumed_at, consumed_order_id')
        .eq('id', intentId)
        .maybeSingle()
      if (intentErr || !intent) {
        throw new Error('결제 인텐트를 찾을 수 없습니다.')
      }
      if (intent.consumed_at && intent.consumed_order_id) {
        // 멱등성: 이미 처리된 인텐트는 성공으로 간주
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              orderId: intent.consumed_order_id,
              paymentKey: payment_key,
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
      orderData = {
        _pending_insert: true,
        _intent_id: intentId,
        _intent_user_id: intent.user_id,
        _pickup: intent.payload,
      }
    } else {
      // 일반 결제인 경우 orders에서 조회 (레거시 PENDING_PAYMENT 흐름)
      // 우선순위:
      //   1) original_order_id (모바일은 Toss orderId가 'MODO_<uuid>_<rand>' 형태라
      //      orders.id로 직접 매칭 불가 → 클라이언트가 보낸 원본 UUID 사용)
      //   2) order_id 자체가 UUID 형태이면 그대로 매칭 (웹 일반결제)
      //   3) 'MODO_<uuid>_*' 패턴이면 UUID 부분 추출
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      let lookupId: string | null = null
      if (typeof original_order_id === 'string' && UUID_RE.test(original_order_id)) {
        lookupId = original_order_id.match(UUID_RE)![0]
      } else if (typeof order_id === 'string' && UUID_RE.test(order_id)) {
        lookupId = order_id.match(UUID_RE)![0]
      }

      if (!lookupId) {
        throw new Error('주문 ID 형식이 올바르지 않습니다. (UUID 필요)')
      }

      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, total_price, payment_status, payment_key, user_id')
        .eq('id', lookupId)
        .single()

      if (error || !data) {
        throw new Error('주문 정보를 찾을 수 없습니다.')
      }

      // 멱등성: 동일 paymentKey로 이미 PAID이면 성공으로 간주 (재시도/중복 confirm 안전)
      if (data.payment_status === 'PAID') {
        if (data.payment_key && data.payment_key === payment_key) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                orderId: order_id,
                paymentKey: payment_key,
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
    if (is_extra_charge && original_order_id) {
      // 추가 비용 결제인 경우 (orders 테이블 기반)
      // extra_charge_status를 COMPLETED로 업데이트
      const updatedExtraChargeData = {
        ...(orderData.extra_charge_data || {}),
        customer_paid_at: new Date().toISOString(),
        payment_key: payment_key,
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

      // 관리자/작업자에게 알림 전송 (추가 결제 완료 알림)
      try {
        // 관리자들에게 알림
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
            metadata: {
              extra_charge_status: 'COMPLETED',
              amount: amount,
              payment_key: payment_key,
            },
          }))

          await supabaseClient.from('notifications').insert(notifications)
        }
      } catch (notifyError) {
        console.log('알림 전송 실패 (무시):', notifyError)
      }
    } else if (is_extra_charge) {
      // 기존 extra_charge_requests 테이블 기반 (호환)
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
    } else if (isCreateOrderFlow) {
      // 🆕 신규 흐름: 결제 성공 → orders insert (PAID 상태로 바로 생성)
      const pickup = (orderData as any)._pickup as Record<string, any>
      const internalUserId = (orderData as any)._intent_user_id as string
      const intentId = (orderData as any)._intent_id as string

      const orderNumber = `ORD${Date.now()}`
      const insertData: Record<string, any> = {
        user_id: internalUserId,
        status: 'PAID',
        payment_status: 'PAID',
        payment_key: payment_key,
        paid_at: tossData.approvedAt || new Date().toISOString(),
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

      // 선택적 컬럼이 DB에 없을 수 있으니 재시도 로직 적용
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
        throw new Error('결제는 승인되었으나 주문 저장에 실패했습니다. 관리자에게 문의해주세요.')
      }

      const newOrderId = (inserted as any).id as string

      // payment_intent consume 마킹
      try {
        await supabaseClient
          .from('payment_intents')
          .update({
            consumed_at: new Date().toISOString(),
            consumed_order_id: newOrderId,
          })
          .eq('id', intentId)
      } catch (e) {
        console.log('intent consume 마킹 실패(무시):', e)
      }

      // 고객 알림
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

      // 응답에 사용
      orderData._resolved_id = newOrderId
      orderData.user_id = internalUserId
      console.log('✅ 신규 흐름: 결제 후 주문 생성 완료', newOrderId)
    } else {
      // 레거시 흐름: 기존 PENDING_PAYMENT 주문 → PAID 업데이트 (모바일 호환용)
      // orders.id 매칭은 위에서 결정된 _resolved_id 사용 (모바일 MODO_* 대응)
      const ordersId = orderData?._resolved_id || order_id
      await supabaseClient
        .from('orders')
        .update({
          status: 'PAID',
          payment_status: 'PAID',
          payment_key: payment_key,
          paid_at: tossData.approvedAt || new Date().toISOString(),
        })
        .eq('id', ordersId)

      // 고객에게 결제 완료 알림
      if (orderData?.user_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.user_id,
          type: 'PAYMENT_COMPLETED',
          title: '결제 완료',
          body: `${amount.toLocaleString()}원 결제가 완료되었습니다.`,
          order_id: ordersId,
        })
      }

      // 수거 예약은 클라이언트(PaymentSuccessClient / 모바일 PaymentPage)에서
      // 결제 확인 후 명시적으로 shipments-book을 호출합니다.
      // (모바일 앱과 동일한 방식 — 이중 호출 방지)
      console.log('✅ 결제 확인 완료. 수거 예약은 클라이언트에서 처리합니다.')
    }

    // 결제 로그 저장 (audit)
    try {
      // 추가결제(orders 기반)는 original_order_id, 레거시는 orderData.order_id, 일반은 lookupId
      const logOrderId = is_extra_charge && original_order_id
        ? original_order_id
        : (is_extra_charge ? (orderData?.order_id || null) : (orderData?._resolved_id || order_id))
      await supabaseClient.from('payment_logs').insert({
        order_id: logOrderId,
        payment_key: payment_key,
        amount: tossData.totalAmount,
        method: tossData.method,
        status: 'SUCCESS',
        provider: 'TOSS',
        is_extra_charge: !!is_extra_charge,
        response_data: tossData,
        approved_at: tossData.approvedAt,
      })
    } catch (logError) {
      // 로그 저장 실패는 무시 (테이블이 없을 수 있음)
      console.log('결제 로그 저장 실패:', logError)
    }

    // 응답 orderId 우선순위:
    //   1) 신규 흐름: 방금 생성된 orders.id (orderData._resolved_id)
    //   2) 레거시:    Toss orderId
    const responseOrderId = (orderData && (orderData as any)._resolved_id) || tossData.orderId

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderId: responseOrderId,
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

