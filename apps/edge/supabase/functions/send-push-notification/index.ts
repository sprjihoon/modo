import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')! // Firebase Console에서 발급

interface NotificationPayload {
  eventId?: string // notification_events.id
  orderId: string
  userId: string
  title: string
  body: string
  fcmToken: string
  data?: Record<string, string>
}

serve(async (req) => {
  try {
    // CORS 처리
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

    // 1. 요청 바디 파싱
    const payload: NotificationPayload = await req.json()
    console.log('📱 푸시 알림 발송 요청:', payload)

    // 2. FCM API 호출
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: payload.fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: 'default',
          badge: '1',
        },
        data: {
          order_id: payload.orderId,
          ...(payload.data || {}),
        },
        priority: 'high',
      }),
    })

    const fcmResult = await fcmResponse.json()
    console.log('✅ FCM 응답:', fcmResult)

    // 3. 결과 확인
    const success = fcmResult.success === 1

    // 4. notification_events 테이블 업데이트 (eventId가 있는 경우)
    if (payload.eventId) {
      await supabase
        .from('notification_events')
        .update({
          notification_sent: success,
          notification_sent_at: success ? new Date().toISOString() : null,
          error_message: success ? null : JSON.stringify(fcmResult),
          retry_count: supabase.rpc('increment_retry_count', { event_id: payload.eventId }),
        })
        .eq('id', payload.eventId)

      console.log(`✅ 이벤트 ${payload.eventId} 업데이트 완료`)
    }

    return new Response(
      JSON.stringify({
        success,
        message: success ? '푸시 알림 발송 성공' : '푸시 알림 발송 실패',
        fcmResult,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: success ? 200 : 500,
      }
    )
  } catch (error) {
    console.error('❌ 푸시 알림 발송 오류:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 500,
      }
    )
  }
})

