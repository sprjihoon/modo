import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * 대기 중인 알림 이벤트를 처리하는 Edge Function
 * 
 * Cron Job으로 주기적으로 실행 (예: 1분마다)
 * 또는 Trigger 직후 호출
 */
serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('🔄 대기 중인 알림 이벤트 처리 시작')

    // 1. 발송되지 않은 이벤트 조회 (최근 24시간 이내, 재시도 3회 미만)
    const { data: events, error } = await supabase
      .from('notification_events')
      .select(`
        id,
        order_id,
        user_id,
        event_type,
        old_status,
        new_status,
        fcm_token,
        retry_count,
        orders (
          order_number,
          extra_charge_data
        )
      `)
      .eq('notification_sent', false)
      .lt('retry_count', 3)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      throw error
    }

    console.log(`📋 처리할 이벤트: ${events.length}개`)

    if (events.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '처리할 이벤트 없음',
          processed: 0,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. 각 이벤트 처리
    const results = await Promise.allSettled(
      events.map(async (event) => {
        if (!event.fcm_token) {
          console.log(`⚠️ 이벤트 ${event.id}: FCM 토큰 없음`)
          return { success: false, eventId: event.id, reason: 'No FCM token' }
        }

        // 알림 메시지 생성
        let title = ''
        let body = ''

        if (event.event_type === 'order_status_changed') {
          const msgResult = await supabase.rpc('get_notification_message', {
            p_status: event.new_status,
            p_order_number: event.orders?.order_number || 'N/A',
          })
          title = msgResult.data?.title || '주문 상태 변경'
          body = msgResult.data?.body || '주문 상태가 변경되었습니다'
        } else if (event.event_type === 'extra_charge_status_changed') {
          const extraChargeData = event.orders?.extra_charge_data || {}
          const price = extraChargeData.managerPrice

          const msgResult = await supabase.rpc('get_extra_charge_notification_message', {
            p_extra_charge_status: event.new_status,
            p_order_number: event.orders?.order_number || 'N/A',
            p_price: price,
          })
          title = msgResult.data?.title || '추가 작업 알림'
          body = msgResult.data?.body || '추가 작업 관련 업데이트가 있습니다'
        }

        // send-push-notification 함수 호출
        const response = await supabase.functions.invoke('send-push-notification', {
          body: {
            eventId: event.id,
            orderId: event.order_id,
            userId: event.user_id,
            title,
            body,
            fcmToken: event.fcm_token,
          },
        })

        return {
          success: response.data?.success || false,
          eventId: event.id,
          response: response.data,
        }
      })
    )

    // 3. 결과 집계
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failCount = results.length - successCount

    console.log(`✅ 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`)

    return new Response(
      JSON.stringify({
        success: true,
        message: '알림 처리 완료',
        total: events.length,
        sent_count: successCount,
        failed: failCount,
        results: results.map((r) => 
          r.status === 'fulfilled' ? r.value : { error: r.reason }
        ),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ 알림 처리 오류:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

