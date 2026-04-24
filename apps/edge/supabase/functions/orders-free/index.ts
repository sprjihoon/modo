// 0원 주문 즉시 생성 (PAID)
//
// - 모바일/웹 공통.
// - PENDING_PAYMENT 폐지 후, totalPrice === 0 인 경우 결제 게이트웨이를 거치지 않고
//   바로 orders 를 PAID 상태로 INSERT 한다.
// - 입력은 orders-quote 와 동일한 견적 입력 형식을 받는다.
// - 응답: { orderId }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: '로그인이 필요합니다.' }, 401)

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: '로그인이 필요합니다.' }, 401)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // orders-quote 호출로 가격/페이로드 재계산 (서버 권위)
    const quoteResp = await fetch(`${SUPABASE_URL}/functions/v1/orders-quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        apikey: SUPABASE_ANON_KEY,
      },
      body: await req.clone().text(),
    })
    const quoteJson = await quoteResp.json()
    if (!quoteResp.ok) {
      return json({ error: quoteJson?.error || '견적 계산 실패' }, 500)
    }
    if (quoteJson.totalPrice !== 0) {
      return json({ error: '0원 주문이 아닙니다. 결제가 필요합니다.', totalPrice: quoteJson.totalPrice }, 400)
    }

    const pickup = quoteJson.pickupPayload as Record<string, any>

    // public.users 매핑
    const userRow = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
      .then((r) => r.data)
    if (!userRow) return json({ error: '사용자 정보를 찾을 수 없습니다.' }, 404)
    const internalUserId = userRow.id as string

    const orderNumber = `ORD${Date.now()}`
    const insertData: Record<string, any> = {
      user_id: internalUserId,
      status: 'PAID',
      payment_status: 'PAID',
      payment_key: null,
      paid_at: new Date().toISOString(),
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
      base_price: pickup.basePrice ?? 0,
      total_price: 0,
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
      const r = await admin.from('orders').insert(insertData).select('id').single()
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
      console.error('0원 주문 insert 실패:', lastErr)
      return json({ error: '0원 주문 생성에 실패했습니다.' }, 500)
    }
    const newOrderId = inserted.id as string

    // 수거 예약 (오류 무시)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/shipments-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          order_id: newOrderId,
          customer_name: insertData.customer_name,
          pickup_address: insertData.pickup_address,
          pickup_phone: insertData.pickup_phone,
          pickup_zipcode: insertData.pickup_zipcode ?? '',
          delivery_address: insertData.delivery_address,
          delivery_phone: insertData.delivery_phone,
          delivery_zipcode: insertData.delivery_zipcode ?? '',
          delivery_message: insertData.notes ?? '',
          test_mode: false,
        }),
      })
    } catch (e) {
      console.warn('shipments-book 호출 실패 (무시):', e)
    }

    // 알림 (오류 무시)
    try {
      await admin.from('notifications').insert({
        user_id: internalUserId,
        type: 'PAYMENT_COMPLETED',
        title: '주문 접수 완료',
        body: '무료 수선 주문이 접수되었습니다.',
        order_id: newOrderId,
      })
    } catch { /* ignore */ }

    return json({ orderId: newOrderId, totalPrice: 0 })
  } catch (e) {
    console.error('orders-free 오류:', e)
    return json({ error: e?.message || '서버 오류' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
