import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { isDeliverableEmail, sendOrderResultEmail } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NotificationPayload {
  eventId?: string
  orderId?: string
  userId?: string
  title: string
  body: string
  fcmToken?: string
  email?: string
  skipEmail?: boolean
  data?: Record<string, string>
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const payload: NotificationPayload = await req.json()
    console.log('📱 알림 발송 요청:', {
      userId: payload.userId,
      orderId: payload.orderId,
      title: payload.title,
      hasToken: !!payload.fcmToken,
      skipEmail: !!payload.skipEmail,
    })

    if (!payload.title || !payload.body) {
      return jsonResponse({ success: false, error: 'title, body는 필수입니다' }, 400)
    }

    let fcmToken = payload.fcmToken || ''
    let email = payload.email || ''
    let customerName = ''

    if (payload.userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('email, name, fcm_token')
        .eq('id', payload.userId)
        .maybeSingle()

      if (!fcmToken) fcmToken = userRow?.fcm_token || ''
      if (!email) email = userRow?.email || ''
      customerName = userRow?.name || ''
    }

    if (!isDeliverableEmail(email) && payload.orderId) {
      const { data: orderRow } = await supabase
        .from('orders')
        .select('customer_email, customer_name')
        .eq('id', payload.orderId)
        .maybeSingle()

      if (isDeliverableEmail(orderRow?.customer_email)) {
        email = orderRow.customer_email
      }
      if (!customerName) customerName = orderRow?.customer_name || ''
    }

    let fcmSent = false
    let fcmError: string | undefined

    if (fcmToken) {
      try {
        const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
        if (!fcmServerKey) {
          fcmError = 'FCM_SERVER_KEY not configured'
        } else {
          const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: fcmToken,
              notification: {
                title: payload.title,
                body: payload.body,
                sound: 'default',
                badge: '1',
              },
              data: {
                order_id: payload.orderId || '',
                ...(payload.data || {}),
              },
              priority: 'high',
            }),
          })

          const fcmResult = await fcmResponse.json()
          console.log('✅ FCM 응답:', fcmResult)
          fcmSent = fcmResult.success === 1
          if (!fcmSent) fcmError = JSON.stringify(fcmResult)
        }
      } catch (error) {
        fcmError = error instanceof Error ? error.message : String(error)
        console.error('❌ FCM 발송 실패:', fcmError)
      }
    }

    let emailSent = false
    let emailId: string | undefined
    let emailError: string | undefined

    if (!payload.skipEmail) {
      const emailResult = await sendOrderResultEmail({
        to: email,
        title: payload.title,
        body: payload.body,
        orderId: payload.orderId,
        customerName,
      })
      emailSent = emailResult.sent
      emailId = emailResult.id
      emailError = emailResult.error
    }

    const success = fcmSent || emailSent

    if (payload.eventId) {
      await supabase.rpc('increment_retry_count', { event_id: payload.eventId })
      await supabase
        .from('notification_events')
        .update({
          notification_sent: success,
          notification_sent_at: success ? new Date().toISOString() : null,
          error_message: success
            ? null
            : JSON.stringify({ fcm: fcmError, email: emailError }),
        })
        .eq('id', payload.eventId)
    }

    return jsonResponse({
      success,
      message: success ? '알림 발송 성공' : '알림 발송 실패',
      fcm: { sent: fcmSent, error: fcmError },
      email: { sent: emailSent, id: emailId, error: emailError },
    }, success ? 200 : 500)
  } catch (error) {
    console.error('❌ 알림 발송 오류:', error)

    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
