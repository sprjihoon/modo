import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN'])

interface AnnouncementPayload {
  announcementId: string
  title: string
  content: string
  targetAudience?: string
  imageUrl?: string
  linkUrl?: string
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(req),
    },
  })
}

async function authorizeSender(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json(req, { success: false, error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice('Bearer '.length)
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) {
    return json(req, { success: false, error: 'Unauthorized' }, 401)
  }

  const { data: staff } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!staff || !ADMIN_ROLES.has(staff.role)) {
    return json(req, { success: false, error: 'Admin role required' }, 403)
  }

  return null
}

/**
 * 공지사항 전체 푸시 발송
 *
 * 대상 사용자의 FCM 토큰을 모두 조회하여 일괄 발송
 */
serve(async (req) => {
  let payload: AnnouncementPayload | undefined
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    const authError = await authorizeSender(req)
    if (authError) return authError

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    try {
      payload = await req.json()
    } catch {
      return json(req, { success: false, error: 'Invalid JSON body' }, 400)
    }

    if (!payload?.announcementId || !payload.title || !payload.content) {
      return json(req, { success: false, error: 'announcementId, title, content는 필수입니다' }, 400)
    }

    console.log('📢 공지사항 푸시 발송 시작:', payload.announcementId)

    const { data: tokens, error } = await supabase.rpc('get_all_fcm_tokens', {
      p_target_audience: payload.targetAudience || 'all',
    })

    if (error) {
      throw error
    }

    const recipients = tokens ?? []
    console.log(`📋 대상 사용자: ${recipients.length}명`)

    if (recipients.length === 0) {
      return json(req, {
        success: true,
        message: '발송 대상이 없습니다',
        total: 0,
        sent_count: 0,
        failed: 0,
      })
    }

    let successCount = 0
    let failCount = 0
    const batchSize = 1000

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const fcmTokens = batch.map((t: { fcm_token: string }) => t.fcm_token)

      try {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            registration_ids: fcmTokens,
            notification: {
              title: payload.title,
              body: payload.content.substring(0, 100),
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
      } catch (batchError) {
        console.error(`❌ 배치 ${Math.floor(i / batchSize) + 1} 발송 실패:`, batchError)
        failCount += batch.length
      }

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ 공지사항 푸시 발송 완료: 성공 ${successCount}/${recipients.length}`)

    return json(req, {
      success: true,
      message: '공지사항 푸시 발송 완료',
      total: recipients.length,
      sent_count: successCount,
      failed: failCount,
    })
  } catch (error) {
    console.error('❌ 공지사항 푸시 발송 오류:', error)

    return json(
      req,
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
