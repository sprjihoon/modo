// 포인트로 전액 결제(잔액 0원) 시 PortOne 없이 주문 생성
// 웹 /api/payment-intents/[id]/complete-with-points 와 동일 동작 (모바일용)

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

    const body = await req.json().catch(() => ({}))
    const intentId = (body?.intentId as string | undefined)?.trim()
    if (!intentId) return json({ error: 'intentId가 필요합니다.' }, 400)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!userRow?.id) return json({ error: '사용자 정보를 찾을 수 없습니다.' }, 404)

    const { data: intent, error: intentErr } = await admin
      .from('payment_intents')
      .select(
        'id, user_id, total_price, points_used, charge_before_points, payload, expires_at, consumed_at, consumed_order_id',
      )
      .eq('id', intentId)
      .maybeSingle()

    if (intentErr || !intent) {
      return json({ error: '결제 정보를 찾을 수 없습니다.' }, 404)
    }
    if (intent.user_id !== userRow.id) {
      return json({ error: '권한이 없습니다.' }, 403)
    }
    if (intent.consumed_at && intent.consumed_order_id) {
      return json({ orderId: intent.consumed_order_id, idempotent: true })
    }
    if (new Date(intent.expires_at).getTime() < Date.now()) {
      return json({ error: '결제 시간이 만료되었습니다.' }, 400)
    }
    if (Number(intent.total_price) !== 0) {
      return json(
        { error: '카드 결제가 필요한 금액이 남아 있습니다.', totalPrice: intent.total_price },
        400,
      )
    }
    if (!intent.points_used || intent.points_used <= 0) {
      return json({ error: '포인트 사용 내역이 없습니다.' }, 400)
    }

    const p = (intent.payload || {}) as Record<string, unknown>
    const orderNumber =
      `ORD${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const insertData: Record<string, unknown> = {
      user_id: userRow.id,
      status: 'PAID',
      payment_status: 'PAID',
      paid_at: new Date().toISOString(),
      order_number: orderNumber,
      item_name: p.itemName,
      clothing_type: p.clothingType || '기타',
      repair_type: p.repairType || '수선',
      pickup_address: p.pickupAddress,
      pickup_address_detail: p.pickupAddressDetail || null,
      pickup_zipcode: p.pickupZipcode || null,
      pickup_phone: p.pickupPhone || '010-0000-0000',
      pickup_date: p.pickupDate || null,
      delivery_address: p.deliveryAddress || p.pickupAddress,
      delivery_address_detail: p.deliveryAddressDetail || p.pickupAddressDetail || null,
      delivery_zipcode: p.deliveryZipcode || p.pickupZipcode || null,
      delivery_phone: p.deliveryPhone || p.pickupPhone || '010-0000-0000',
      customer_name: p.customerName || '고객',
      customer_phone: p.customerPhone || p.pickupPhone || '010-0000-0000',
      customer_email: p.customerEmail || null,
      notes: p.notes || null,
      base_price: p.basePrice ?? null,
      total_price: 0,
      shipping_fee: p.shippingFee ?? null,
      shipping_discount_amount: p.shippingDiscountAmount ?? 0,
      shipping_promotion_id: p.shippingPromotionId || null,
      remote_area_fee: p.remoteAreaFee ?? 0,
      promotion_code_id: p.promotionCodeId || null,
      promotion_discount_amount: p.promotionDiscountAmount ?? null,
      original_total_price: intent.charge_before_points ?? p.originalTotalPrice ?? null,
      points_used: intent.points_used,
      repair_parts: Array.isArray(p.repairParts) ? p.repairParts : null,
      images_with_pins: Array.isArray(p.imagesWithPins) ? p.imagesWithPins : null,
      images: Array.isArray(p.imageUrls) ? { urls: p.imageUrls } : null,
    }

    let inserted: { id: string } | null = null
    let lastErr: { code?: string; message?: string } | null = null
    for (let attempt = 0; attempt < 12; attempt++) {
      const r = await admin.from('orders').insert(insertData).select('id').single()
      if (!r.error) {
        inserted = r.data as { id: string }
        break
      }
      lastErr = r.error as { code?: string; message?: string }
      const m = lastErr?.message?.match(/Could not find the '(.+?)' column/)
      if (lastErr.code === 'PGRST204' && m?.[1]) {
        delete insertData[m[1]]
        continue
      }
      break
    }

    if (!inserted) {
      console.error('[payments-complete-with-points] insert fail', lastErr)
      return json({ error: '주문 생성 실패' }, 500)
    }

    await admin
      .from('payment_intents')
      .update({
        consumed_at: new Date().toISOString(),
        consumed_order_id: inserted.id,
      })
      .eq('id', intentId)

    try {
      await admin
        .from('point_transactions')
        .update({ order_id: inserted.id })
        .eq('user_id', userRow.id)
        .eq('type', 'USED')
        .is('order_id', null)
        .like('description', `%intent:${intentId}%`)
    } catch {
      /* ignore */
    }

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/shipments-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ order_id: inserted.id }),
      })
    } catch (e) {
      console.error('[payments-complete-with-points] book', e)
    }

    return json({ orderId: inserted.id })
  } catch (e) {
    console.error('[payments-complete-with-points]', e)
    return json({ error: (e as Error)?.message || '서버 오류' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
