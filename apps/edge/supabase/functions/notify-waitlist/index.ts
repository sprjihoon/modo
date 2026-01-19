import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!

interface WaitlistUser {
  waitlist_id: string
  user_id: string
  fcm_token: string | null
  created_at: string
}

/**
 * 대기자에게 "접수 가능" 푸시 알림 발송
 * 
 * 사용법:
 * - POST /functions/v1/notify-waitlist
 * - body: { date?: string } (기본값: 오늘)
 */
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

    // 요청 바디 파싱
    let targetDate = new Date().toISOString().split('T')[0] // 기본값: 오늘
    try {
      const body = await req.json()
      if (body?.date) {
        targetDate = body.date
      }
    } catch {
      // body가 없거나 파싱 실패 시 기본값 사용
    }

    console.log(`📣 대기자 알림 발송 시작 - 날짜: ${targetDate}`)

    // 1. 대기 중인 사용자 목록 조회
    const { data: waitlistUsers, error: fetchError } = await supabase.rpc(
      'get_pending_waitlist_users',
      { p_date: targetDate }
    )

    if (fetchError) {
      console.error('대기자 조회 실패:', fetchError)
      throw fetchError
    }

    if (!waitlistUsers || waitlistUsers.length === 0) {
      console.log('📭 대기 중인 사용자가 없습니다')
      return new Response(
        JSON.stringify({
          success: true,
          message: '대기 중인 사용자가 없습니다',
          notified_count: 0,
          total_waitlist: 0,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log(`📋 대기자 ${waitlistUsers.length}명 발견`)

    // 2. 각 사용자에게 푸시 알림 발송
    const notifiedIds: string[] = []
    const failedIds: string[] = []

    for (const user of waitlistUsers as WaitlistUser[]) {
      if (!user.fcm_token) {
        console.log(`⚠️ FCM 토큰 없음: ${user.user_id}`)
        failedIds.push(user.waitlist_id)
        continue
      }

      try {
        // FCM API 호출
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: user.fcm_token,
            notification: {
              title: '🎉 접수 가능해요!',
              body: '수선 서비스가 지금 접수 가능합니다. 지금 바로 신청해보세요!',
              sound: 'default',
              badge: '1',
            },
            data: {
              type: 'ORDER_AVAILABLE',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            priority: 'high',
          }),
        })

        const fcmResult = await fcmResponse.json()
        
        if (fcmResult.success === 1) {
          console.log(`✅ 발송 성공: ${user.user_id}`)
          notifiedIds.push(user.waitlist_id)

          // 알림 테이블에도 기록
          await supabase.from('notifications').insert({
            user_id: user.user_id,
            type: 'ORDER_AVAILABLE',
            title: '🎉 접수 가능해요!',
            body: '수선 서비스가 지금 접수 가능합니다. 지금 바로 신청해보세요!',
            data: { type: 'ORDER_AVAILABLE' },
          })
        } else {
          console.log(`❌ 발송 실패: ${user.user_id}`, fcmResult)
          failedIds.push(user.waitlist_id)
        }
      } catch (pushError) {
        console.error(`❌ 푸시 발송 오류: ${user.user_id}`, pushError)
        failedIds.push(user.waitlist_id)
      }
    }

    // 3. 발송 완료된 대기자 상태 업데이트
    if (notifiedIds.length > 0) {
      const { error: updateError } = await supabase.rpc(
        'mark_waitlist_notified',
        { p_waitlist_ids: notifiedIds }
      )

      if (updateError) {
        console.error('대기자 상태 업데이트 실패:', updateError)
      } else {
        console.log(`✅ ${notifiedIds.length}명 상태 업데이트 완료`)
      }
    }

    console.log(`📣 알림 발송 완료: 성공 ${notifiedIds.length}명, 실패 ${failedIds.length}명`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${notifiedIds.length}명에게 알림을 발송했습니다`,
        notified_count: notifiedIds.length,
        failed_count: failedIds.length,
        total_waitlist: waitlistUsers.length,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('❌ 대기자 알림 발송 오류:', error)

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

