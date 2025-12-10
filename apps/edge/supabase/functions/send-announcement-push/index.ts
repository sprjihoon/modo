import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!

interface AnnouncementPayload {
  announcementId: string
  title: string
  content: string
  targetAudience?: string
  imageUrl?: string
  linkUrl?: string
}

/**
 * 공지사항 전체 푸시 발송
 * 
 * 대상 사용자의 FCM 토큰을 모두 조회하여 일괄 발송
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
    const payload: AnnouncementPayload = await req.json()

    console.log('📢 공지사항 푸시 발송 시작:', payload.announcementId)

    // 1. 공지사항 상태 업데이트 (sending)
    await supabase
      .from('announcements')
      .update({ 
        status: 'sending',
        sent_at: new Date().toISOString(),
      })
      .eq('id', payload.announcementId)

    // 2. 대상 사용자의 FCM 토큰 조회
    const { data: tokens, error } = await supabase.rpc('get_all_fcm_tokens', {
      p_target_audience: payload.targetAudience || 'all',
    })

    if (error) {
      throw error
    }

    console.log(`📋 대상 사용자: ${tokens.length}명`)

    if (tokens.length === 0) {
      await supabase
        .from('announcements')
        .update({ 
          status: 'sent',
          total_recipients: 0,
          push_sent_count: 0,
        })
        .eq('id', payload.announcementId)

      return new Response(
        JSON.stringify({
          success: true,
          message: '발송 대상이 없습니다',
          total: 0,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. FCM 멀티캐스트 발송 (최대 1000개씩)
    let successCount = 0
    let failCount = 0
    const batchSize = 1000

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)
      const fcmTokens = batch.map((t: any) => t.fcm_token)

      try {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            registration_ids: fcmTokens, // 멀티캐스트
            notification: {
              title: payload.title,
              body: payload.content.substring(0, 100), // 100자로 제한
              sound: 'default',
              badge: '1',
              ...(payload.imageUrl && { image: payload.imageUrl }),
            },
            data: {
              announcement_id: payload.announcementId,
              type: 'announcement',
              ...(payload.linkUrl && { link_url: payload.linkUrl }),
            },
            priority: 'high',
          }),
        })

        const fcmResult = await fcmResponse.json()
        console.log(`✅ 배치 ${Math.floor(i / batchSize) + 1} 발송 완료:`, fcmResult)

        successCount += fcmResult.success || 0
        failCount += fcmResult.failure || 0
      } catch (error) {
        console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 발송 실패:`, error)
        failCount += batch.length
      }

      // API 과부하 방지를 위한 딜레이 (100ms)
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 4. 공지사항 상태 업데이트 (sent)
    await supabase
      .from('announcements')
      .update({ 
        status: 'sent',
        total_recipients: tokens.length,
        push_sent_count: successCount,
        push_failed_count: failCount,
      })
      .eq('id', payload.announcementId)

    console.log(`✅ 공지사항 푸시 발송 완료: 성공 ${successCount}/${tokens.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: '공지사항 푸시 발송 완료',
        total: tokens.length,
        success: successCount,
        failed: failCount,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('❌ 공지사항 푸시 발송 오류:', error)

    // 공지사항 상태를 failed로 업데이트
    if (req.json) {
      try {
        const payload = await req.json()
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        await supabase
          .from('announcements')
          .update({ status: 'failed' })
          .eq('id', payload.announcementId)
      } catch (e) {
        console.error('상태 업데이트 실패:', e)
      }
    }

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

