// 주문 가격 견적 (payment_intents 생성)
//
// - 모바일/웹 공통.
// - PENDING_PAYMENT 폐지 후, 결제 시작 직전에 호출하여
//   서버가 권위적 가격을 계산해 payment_intents 에 저장한다.
// - 응답으로 받은 intentId 를 Toss orderId 로 사용.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RepairPart { name?: string; price?: number; quantity?: number; detail?: string }
interface InputItem {
  clothingType?: string
  clothingCategoryId?: string
  repairItems?: RepairPart[]
  imagesWithPins?: Array<{ imageUrl: string; pins?: unknown[] }>
}

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
    if (!authHeader) {
      return json({ error: '로그인이 필요합니다.' }, 401)
    }

    // 사용자 식별 (anon + Authorization → auth.getUser)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: '로그인이 필요합니다.' }, 401)

    // service-role 로 모든 후속 처리
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // public.users 매핑
    let userRow = await admin
      .from('users')
      .select('id, name, phone, email')
      .eq('auth_id', user.id)
      .maybeSingle()
      .then((r) => r.data)
    if (!userRow) {
      // 자동 생성 (web 의 createOrder 와 동일 정책)
      const inserted = await admin
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email ?? 'unknown@example.com',
          name: (user.user_metadata?.name as string) ?? '사용자',
          phone: (user.user_metadata?.phone as string) ?? '',
        })
        .select('id, name, phone, email')
        .single()
      userRow = inserted.data ?? null
      if (!userRow) return json({ error: '사용자 정보를 생성할 수 없습니다.' }, 500)
    }

    const internalUserId = userRow.id as string
    const userName = (userRow.name as string) || '고객'
    const userEmail = (userRow.email as string) || user.email || null
    const userPhone = (userRow.phone as string) || '010-0000-0000'

    const body = await req.json().catch(() => ({}))

    const itemsArr: InputItem[] = Array.isArray(body.items) ? body.items : []
    const clothingType = (itemsArr[0]?.clothingType as string) ?? body.clothingType ?? ''
    const repairItems: RepairPart[] = itemsArr.length > 0
      ? itemsArr.flatMap((it) => it.repairItems ?? [])
      : (Array.isArray(body.repairItems) ? body.repairItems : [])
    const imagesWithPins: Array<{ imageUrl: string; pins?: unknown[] }> = itemsArr.length > 0
      ? itemsArr.flatMap((it) => it.imagesWithPins ?? [])
      : (Array.isArray(body.imagesWithPins) ? body.imagesWithPins : [])

    const itemName = repairItems.map((i) => i.name).filter(Boolean).join(', ') || clothingType || '수선'
    const repairType = (repairItems[0]?.name as string) || '기타'

    // 글로벌 배송비 설정
    const shipSettingsRow = await admin
      .from('shipping_settings')
      .select('base_shipping_fee, remote_area_fee')
      .limit(1)
      .maybeSingle()
      .then((r) => r.data)
    const BASE_SHIPPING_FEE = (shipSettingsRow?.base_shipping_fee as number | undefined) ?? 7000
    const REMOTE_AREA_FEE = (shipSettingsRow?.remote_area_fee as number | undefined) ?? 0

    // 수선비 합계
    const repairItemsTotal = repairItems.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0,
    )

    // 배송비 프로모션
    let shippingFee = BASE_SHIPPING_FEE
    let shippingDiscountAmount = 0
    let shippingPromotionId: string | null = null
    try {
      const now = new Date().toISOString()
      const promosResp = await admin
        .from('shipping_promotions')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', now)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
      const promos = (promosResp.data ?? []) as any[]

      if (promos.length > 0) {
        const hasFirstOrderPromo = promos.some((p) => p.type === 'FIRST_ORDER')
        let isFirstOrder = false
        if (hasFirstOrderPromo) {
          const c = await admin
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', internalUserId)
            .neq('status', 'CANCELLED')
          isFirstOrder = (c.count ?? 0) === 0
        }
        let bestDiscount = 0
        let bestPromoId: string | null = null
        for (const p of promos) {
          let eligible = false
          switch (p.type) {
            case 'FIRST_ORDER':
              eligible = isFirstOrder
              break
            case 'FREE_ABOVE_AMOUNT':
            case 'PERCENTAGE_OFF':
            case 'FIXED_DISCOUNT':
              eligible = repairItemsTotal >= (p.min_order_amount ?? 0)
              break
          }
          if (!eligible) continue
          let discountAmt = p.discount_type === 'PERCENTAGE'
            ? Math.round(BASE_SHIPPING_FEE * p.discount_value / 100)
            : p.discount_value
          if (p.max_discount_amount != null) discountAmt = Math.min(discountAmt, p.max_discount_amount)
          discountAmt = Math.min(discountAmt, BASE_SHIPPING_FEE)
          if (discountAmt > bestDiscount) {
            bestDiscount = discountAmt
            bestPromoId = p.id
          }
        }
        shippingDiscountAmount = bestDiscount
        shippingFee = BASE_SHIPPING_FEE - bestDiscount
        shippingPromotionId = bestPromoId
      }
    } catch (e) {
      console.warn('배송비 프로모션 확인 실패:', e)
    }

    // 도서산간 추가비 (간단 처리: 제주/도서 우편번호 prefix 기반)
    const remoteAreaFee = isRemoteArea(body.pickupZipcode || '') ? REMOTE_AREA_FEE : 0

    // 프로모션 코드 검증
    let promotionDiscountAmount = 0
    let verifiedPromotionCodeId: string | null = null
    if (body.promotionCodeId) {
      try {
        const pr = await admin
          .from('promotion_codes')
          .select('*')
          .eq('id', body.promotionCodeId)
          .eq('is_active', true)
          .maybeSingle()
        const promo = pr.data
        if (promo) {
          let calc = promo.discount_type === 'PERCENTAGE'
            ? Math.round(repairItemsTotal * promo.discount_value / 100)
            : promo.discount_value
          if (promo.max_discount_amount != null) calc = Math.min(calc, promo.max_discount_amount)
          calc = Math.min(calc, repairItemsTotal)
          promotionDiscountAmount = calc
          verifiedPromotionCodeId = promo.id
        }
      } catch (e) {
        console.warn('프로모션 코드 검증 실패:', e)
      }
    }

    const repairFinalPrice = repairItemsTotal - promotionDiscountAmount
    const totalPrice = Math.max(0, repairFinalPrice + shippingFee + remoteAreaFee)
    const originalTotalPrice = repairItemsTotal + shippingFee + remoteAreaFee

    const finalDeliveryAddress = body.deliveryAddress || body.pickupAddress || ''
    const finalDeliveryAddressDetail = body.deliveryAddressDetail || body.pickupAddressDetail || null
    const finalDeliveryZipcode = body.deliveryZipcode || body.pickupZipcode || null

    const pickupPhone = body.pickupPhone || userPhone
    const deliveryPhone = body.deliveryPhone || pickupPhone
    const customerName = body.customerName || userName
    const customerPhone = body.customerPhone || pickupPhone

    const pickupPayload = {
      itemName,
      clothingType: clothingType || '기타',
      repairType,
      repairParts: repairItems.length > 0 ? repairItems : null,
      imagesWithPins: imagesWithPins.length > 0 ? imagesWithPins : null,
      imageUrls: imagesWithPins.length > 0
        ? imagesWithPins.map((i) => i.imageUrl).filter(Boolean)
        : (Array.isArray(body.imageUrls) ? body.imageUrls : null),

      pickupAddress: body.pickupAddress || '',
      pickupAddressDetail: body.pickupAddressDetail || null,
      pickupZipcode: body.pickupZipcode || null,
      pickupPhone,
      pickupDate: body.pickupDate || null,

      deliveryAddress: finalDeliveryAddress,
      deliveryAddressDetail: finalDeliveryAddressDetail,
      deliveryZipcode: finalDeliveryZipcode,
      deliveryPhone,

      customerName,
      customerEmail: body.customerEmail || userEmail,
      customerPhone,

      notes: body.notes || null,

      basePrice: repairItemsTotal,
      shippingFee: BASE_SHIPPING_FEE,
      shippingDiscountAmount,
      shippingPromotionId,
      remoteAreaFee,
      promotionCodeId: verifiedPromotionCodeId,
      promotionDiscountAmount,
      originalTotalPrice,
    }

    // payment_intents insert (service-role 우회)
    const insertResp = await admin
      .from('payment_intents')
      .insert({
        user_id: internalUserId,
        total_price: totalPrice,
        payload: pickupPayload,
      })
      .select('id')
      .single()
    if (insertResp.error) {
      console.error('payment_intents insert 실패:', insertResp.error)
      return json({ error: '결제 인텐트 생성에 실패했습니다.' }, 500)
    }

    return json({
      intentId: insertResp.data.id as string,
      totalPrice,
      shippingFee,
      shippingDiscountAmount,
      shippingPromotionId,
      remoteAreaFee,
      repairItemsTotal,
      promotionDiscountAmount,
      verifiedPromotionCodeId,
      pickupPayload,
    })
  } catch (e) {
    console.error('orders-quote 오류:', e)
    return json({ error: e?.message || '서버 오류' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 도서산간 우편번호 (제주/울릉/백령 등) 간단 매칭
function isRemoteArea(zipcode: string): boolean {
  if (!zipcode) return false
  const z = zipcode.trim()
  // 제주: 63000~63644
  // 울릉: 40200~40240
  // 백령: 23100~23104
  const n = parseInt(z, 10)
  if (Number.isNaN(n)) return false
  if (n >= 63000 && n <= 63644) return true
  if (n >= 40200 && n <= 40240) return true
  if (n >= 23100 && n <= 23104) return true
  return false
}
