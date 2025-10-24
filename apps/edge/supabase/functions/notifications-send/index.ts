/**
 * 푸시 알림 전송 API
 * POST /notifications-send
 * 
 * FCM을 통해 푸시 알림 전송
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { sendFCMNotification } from '../_shared/fcm.ts';

interface NotificationSendRequest {
  user_id: string;
  title: string;
  body: string;
  type: string;
  order_id?: string;
  tracking_no?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
    }

    // 요청 본문 파싱
    const body: NotificationSendRequest = await req.json();
    const { user_id, title, body: message, type, order_id, tracking_no, data } = body;

    // 필수 필드 검증
    if (!user_id || !title || !message || !type) {
      return errorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 사용자 FCM 토큰 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, fcm_token')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // 알림 DB에 저장
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        body: message,
        order_id,
        tracking_no,
        data: data || {},
        fcm_sent: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
      return errorResponse('Failed to save notification', 500, 'DB_ERROR');
    }

    // FCM 푸시 전송
    if (user.fcm_token) {
      try {
        await sendFCMNotification(user.fcm_token, {
          title,
          body: message,
          data: {
            ...data,
            notification_id: notification.id,
            type,
          },
        });

        // FCM 전송 성공 표시
        await supabase
          .from('notifications')
          .update({
            fcm_sent: true,
            fcm_sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

      } catch (fcmError) {
        console.error('FCM send error:', fcmError);
        // FCM 실패해도 알림은 DB에 저장됨
      }
    }

    // 성공 응답
    return successResponse(
      {
        notification,
        fcm_sent: !!user.fcm_token,
        message: '알림이 전송되었습니다',
      },
      201
    );

  } catch (error) {
    console.error('Notification send error:', error);
    return errorResponse(error.message || 'Internal server error', 500, 'INTERNAL_ERROR');
  }
});

