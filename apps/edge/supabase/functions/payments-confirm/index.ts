// PortOne V1 ?? ?? (IMP SDK)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const IMP_KEY = Deno.env.get('IMP_KEY') || ''
const IMP_SECRET = Deno.env.get('IMP_SECRET') || ''
const IMP_API_URL = 'https://api.iamport.kr'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!IMP_KEY || !IMP_SECRET) {
      throw new Error('IMP_KEY / IMP_SECRET ????? ???? ?????.')
    }

    const {
      imp_uid,       // PortOne V1 ?? ID
      payment_id,    // imp_uid ?? V2 paymentId (??)
      order_id,      // payment_intent.id (merchant_uid)
      amount: rawAmount,
      is_extra_charge = false,
      original_order_id,
      pickup_payload,
    } = await req.json()

    const effectiveImpUid = imp_uid || payment_id  // V1 ??, V2 legacy ??

    // amount? isCreateOrderFlow(?? intent ?? ??)?? ???
    let amount: number | undefined = rawAmount ? Number(rawAmount) : undefined

    if (!effectiveImpUid || !order_id) {
      throw new Error('?? ????? ???????. (imp_uid, order_id)')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ?? ??: pickup_payload ? ???? ?? ? orders INSERT
    const isCreateOrderFlow = !is_extra_charge && pickup_payload && typeof pickup_payload === 'object'

    let originalAmount: number | null = null
    let orderData: any = null

    if (is_extra_charge && original_order_id) {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, extra_charge_status, extra_charge_data, user_id, order_number, item_name')
        .eq('id', original_order_id)
        .single()

      if (error || !data) throw new Error('?? ??? ?? ? ????.')
      if (data.extra_charge_status !== 'PENDING_CUSTOMER') {
        throw new Error('?? ?? ????? ????.')
      }

      const extraChargeData = data.extra_charge_data || {}
      originalAmount = extraChargeData.manager_price || extraChargeData.managerPrice
      if (!originalAmount) throw new Error('?? ?? ?? ??? ?? ? ????.')
      orderData = data

    } else if (is_extra_charge) {
      const { data, error } = await supabaseClient
        .from('extra_charge_requests')
        .select('*')
        .eq('id', order_id)
        .single()

      if (error || !data) throw new Error('?? ?? ??? ?? ? ????.')
      originalAmount = data.amount
      orderData = data

    } else if (isCreateOrderFlow) {
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      const HEX32_RE = /^[0-9a-f]{32}$/i
      const rawId = typeof order_id === 'string' ? order_id : ''
      let intentId: string | null = null

      const m = rawId.match(UUID_RE)
      if (m) {
        intentId = m[0]
      } else if (HEX32_RE.test(rawId)) {
        // KCP ?? paymentId (UUID ??? ?? ??) ? UUID? ??
        intentId = `${rawId.slice(0,8)}-${rawId.slice(8,12)}-${rawId.slice(12,16)}-${rawId.slice(16,20)}-${rawId.slice(20)}`
      }

      if (!intentId) throw new Error('order_id ? UUID(intent_id) ????? ???.')

      const { data: intent, error: intentErr } = await supabaseClient
        .from('payment_intents')
        .select('id, user_id, total_price, payload, expires_at, consumed_at, consumed_order_id')
        .eq('id', intentId)
        .maybeSingle()

      if (intentErr || !intent) throw new Error('?? ???? ?? ? ????.')

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
        throw new Error('?? ???? ???????. ?? ??????.')
      }

      originalAmount = intent.total_price
      // ??????? amount? ?? ?? ?? intent.total_price? ??
      // (isCreateOrderFlow?? ??? ??? ??? ????? ??)
      if (!amount) amount = originalAmount
      orderData = {
        _pending_insert: true,
        _intent_id: intentId,
        _intent_user_id: intent.user_id,
        _pickup: intent.payload,
      }

    } else {
      // ??? ??: ?? orders ??
      const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      let lookupId: string | null = null
      if (typeof original_order_id === 'string' && UUID_RE.test(original_order_id)) {
        lookupId = original_order_id.match(UUID_RE)![0]
      } else if (typeof order_id === 'string' && UUID_RE.test(order_id)) {
        lookupId = order_id.match(UUID_RE)![0]
      }
      if (!lookupId) throw new Error('?? ID ??? ???? ????. (UUID ??)')

      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, total_price, payment_status, payment_id, user_id')
        .eq('id', lookupId)
        .single()

      if (error || !data) throw new Error('?? ??? ?? ? ????.')

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
        throw new Error('?? ??? ??? ?????.')
      }

      originalAmount = data.total_price
      orderData = { ...data, _resolved_id: lookupId }
    }

    // ?? ?? ??
    if (originalAmount && originalAmount !== amount) {
      throw new Error(`?? ??? ???? ????. ????: ${originalAmount}?, ????: ${amount}?`)
    }

    // ??? V1: ??? ?? ?? ? ?? ? ?? ??
    const tokenRes = await fetch(`${IMP_API_URL}/users/getToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imp_key: IMP_KEY, imp_secret: IMP_SECRET }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.code !== 0) {
      throw new Error(`??? ?? ?? ??: ${tokenData.message}`)
    }
    const accessToken: string = tokenData.response.access_token

    const portoneRes = await fetch(
      `${IMP_API_URL}/payments/${encodeURIComponent(effectiveImpUid)}`,
      { headers: { Authorization: accessToken } }
    )
    const portoneRaw = await portoneRes.json()

    if (portoneRaw.code !== 0) {
      console.error('??? ?? ?? ??:', portoneRaw)
      throw new Error(portoneRaw.message || '?? ??? ??????.')
    }

    const portoneData = portoneRaw.response

    if (portoneData.status !== 'paid') {
      throw new Error(`??? ???? ?????. (status: ${portoneData.status})`)
    }

    if (amount && portoneData.amount !== amount) {
      throw new Error(`?? ??? ???? ????. ???: ${portoneData.amount}?, ??: ${amount}?`)
    }
    // amount? ??? portoneData.amount? ??? ???? ??
    if (!amount) amount = portoneData.amount

    const paidAt = portoneData.paid_at
      ? new Date(portoneData.paid_at * 1000).toISOString()
      : new Date().toISOString()
    const payMethod = portoneData.pay_method || 'card'

    console.log('? ??? ?? ?? ??:', order_id)

    // ?? DB ???? ??
    if (is_extra_charge && original_order_id) {
      const updatedExtraChargeData = {
        ...(orderData.extra_charge_data || {}),
        customer_paid_at: paidAt,
        payment_id: effectiveImpUid,
        paid_amount: amount,
      }

      await supabaseClient
        .from('orders')
        .update({
          extra_charge_status: 'COMPLETED',
          extra_charge_data: updatedExtraChargeData,
        })
        .eq('id', original_order_id)

      console.log('? ?? ?? ?? - extra_charge_status: COMPLETED')

      try {
        const { data: managers } = await supabaseClient
          .from('users')
          .select('id')
          .in('role', ['MANAGER', 'ADMIN'])

        if (managers && managers.length > 0) {
          const notifications = managers.map((manager: any) => ({
            user_id: manager.id,
            type: 'extra_charge_status_changed',
            title: '?? ?? ??',
            body: `??(${orderData.order_number || original_order_id})? ?? ??? ???????. ??? ??????.`,
            order_id: original_order_id,
            metadata: { extra_charge_status: 'COMPLETED', amount, payment_id },
          }))
          await supabaseClient.from('notifications').insert(notifications)
        }
      } catch (e) {
        console.log('?? ?? ?? (??):', e)
      }

    } else if (is_extra_charge) {
      await supabaseClient
        .from('extra_charge_requests')
        .update({
          status: 'PAID',
          payment_id: effectiveImpUid,
          customer_response_at: paidAt,
        })
        .eq('id', order_id)

      if (orderData?.worker_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.worker_id,
          type: 'EXTRA_CHARGE_RESPONSE',
          title: '?? ?? ?? ??',
          body: `??? ?? ?? ${amount.toLocaleString()}?? ??????.`,
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
        payment_id: effectiveImpUid,
        paid_at: paidAt,
        order_number: orderNumber,
        item_name: pickup.itemName,
        clothing_type: pickup.clothingType || '??',
        repair_type: pickup.repairType || '??',
        pickup_address: pickup.pickupAddress,
        pickup_address_detail: pickup.pickupAddressDetail || null,
        pickup_zipcode: pickup.pickupZipcode || null,
        pickup_phone: pickup.pickupPhone || '010-0000-0000',
        pickup_date: pickup.pickupDate || null,
        delivery_address: pickup.deliveryAddress || pickup.pickupAddress,
        delivery_address_detail: pickup.deliveryAddressDetail || pickup.pickupAddressDetail || null,
        delivery_zipcode: pickup.deliveryZipcode || pickup.pickupZipcode || null,
        delivery_phone: pickup.deliveryPhone || pickup.pickupPhone || '010-0000-0000',
        customer_name: pickup.customerName || '??',
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
        console.error('?? insert ??:', lastErr)

        // ????? ?? ?? ?? (??? ????? ?? ??? ??? ?? ??)
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
                title: '?? ?? ? ?? ?? ??',
                body: `?? ${payment_id}? ????? ?? ??? ??????. payment_intents ID: ${intentId}`,
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
          console.error('??? ?? ?? ??(??):', notifyErr)
        }

        throw new Error('??? ?????? ?? ??? ??????. ????? ??????.')
      }

      const newOrderId = (inserted as any).id as string

      try {
        await supabaseClient
          .from('payment_intents')
          .update({ consumed_at: new Date().toISOString(), consumed_order_id: newOrderId })
          .eq('id', intentId)
      } catch (e) {
        console.log('intent consume ?? ??(??):', e)
      }

      try {
        await supabaseClient.from('notifications').insert({
          user_id: internalUserId,
          type: 'PAYMENT_COMPLETED',
          title: '?? ??',
          body: `${amount.toLocaleString()}? ??? ???????.`,
          order_id: newOrderId,
        })
      } catch (e) {
        console.log('?? ?? ??(??):', e)
      }

      orderData._resolved_id = newOrderId
      orderData.user_id = internalUserId
      console.log('? ?? ??: ?? ? ?? ?? ??', newOrderId)

    } else {
      // ??? ??
      const ordersId = orderData?._resolved_id || order_id
      await supabaseClient
        .from('orders')
        .update({
          status: 'PAID',
          payment_status: 'PAID',
          payment_id: effectiveImpUid,
          paid_at: paidAt,
        })
        .eq('id', ordersId)

      if (orderData?.user_id) {
        await supabaseClient.from('notifications').insert({
          user_id: orderData.user_id,
          type: 'PAYMENT_COMPLETED',
          title: '?? ??',
          body: `${amount.toLocaleString()}? ??? ???????.`,
          order_id: ordersId,
        })
      }
    }

    // ?? ??
    try {
      const logOrderId = is_extra_charge && original_order_id
        ? original_order_id
        : (is_extra_charge ? (orderData?.order_id || null) : (orderData?._resolved_id || order_id))

      await supabaseClient.from('payment_logs').insert({
        order_id: logOrderId,
        payment_id: effectiveImpUid,
        amount: portoneData.amount,
        method: payMethod,
        status: 'SUCCESS',
        provider: 'PORTONE',
        is_extra_charge: !!is_extra_charge,
        response_data: portoneData,
        approved_at: paidAt,
      })
    } catch (e) {
      console.log('?? ?? ?? ??:', e)
    }

    const responseOrderId = (orderData && (orderData as any)._resolved_id) || order_id

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderId: responseOrderId,
          paymentId: effectiveImpUid,
          method: payMethod,
          totalAmount: portoneData.amount,
          approvedAt: paidAt,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('?? ?? ?? ??:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || '?? ??? ??????.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
