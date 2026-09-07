/**
 * 수거일 알림 발송 Edge Function
 * 
 * Cron으로 매일 아침 9시에 실행
 * - D-1 알림: 내일 수거 예정인 주문에 푸시 발송
 * - 당일 알림: 오늘 수거 예정인 주문에 푸시 발송
 * 
 * POST /send-pickup-reminders
 * Body: { type?: 'D-1' | 'TODAY' | 'ALL' }
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { sendFCMNotification } from '../_shared/fcm.ts';

interface PickupReminderRequest {
  type?: 'D-1' | 'TODAY' | 'ALL'; // 기본값: ALL
}

interface ReminderTarget {
  shipment_id: string;
  order_id: string;
  user_id: string;
  tracking_no: string;
  pickup_scheduled_date: string;
  customer_name: string;
  pickup_address: string;
  fcm_token?: string;
}

// 날짜 포맷 함수
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatKoreanDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(month)}월 ${parseInt(day)}일`;
}

// 템플릿 변수 치환 함수
const INACTIVE_ORDER_STATUSES = new Set([
  'CANCELLED',
  'RETURN_PENDING',
  'RETURN_SHIPPING',
  'RETURN_DONE',
]);

function isInactiveOrder(target: { orders?: { status?: string } | { status?: string }[] | null }): boolean {
  const raw = target.orders;
  const status = Array.isArray(raw) ? raw[0]?.status : raw?.status;
  return !!status && INACTIVE_ORDER_STATUSES.has(status);
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

interface NotificationTemplate {
  id: string;
  template_key: string;
  title: string;
  body: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 또는 GET 허용 (Cron은 POST로 호출)
    let reminderType: 'D-1' | 'TODAY' | 'ALL' = 'ALL';
    
    if (req.method === 'POST') {
      try {
        const body: PickupReminderRequest = await req.json();
        reminderType = body.type || 'ALL';
      } catch {
        // body가 없어도 ALL로 진행
      }
    }

    console.log('🔔 수거일 알림 발송 시작:', { type: reminderType });

    // Supabase 클라이언트 생성 (service_role)
    const supabase = createSupabaseClient(req);

    // 오늘, 내일 날짜 계산
    const now = new Date();
    const today = formatDate(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    console.log('📅 날짜 정보:', { today, tomorrow: tomorrowStr });

    const results = {
      d1: { sent: 0, failed: 0, targets: [] as string[] },
      today: { sent: 0, failed: 0, targets: [] as string[] },
    };

    // 📋 알림 템플릿 조회
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('template_key, title, body, is_active')
      .in('template_key', ['pickup_reminder_d1', 'pickup_reminder_today']);

    const templateMap: Record<string, NotificationTemplate> = {};
    for (const t of templates || []) {
      templateMap[t.template_key] = t;
    }

    // 기본 템플릿 (DB에 없을 경우 사용)
    const defaultD1Template = {
      title: '📦 내일 수거 예정',
      body: '{{pickup_date}} 의류 수거가 예정되어 있습니다. 의류를 준비해주세요!',
      is_active: true,
    };
    const defaultTodayTemplate = {
      title: '🚚 오늘 수거일입니다',
      body: '택배기사님이 방문 예정입니다. 문 앞에 의류를 준비해주세요!',
      is_active: true,
    };

    const d1Template = templateMap['pickup_reminder_d1'] || defaultD1Template;
    const todayTemplate = templateMap['pickup_reminder_today'] || defaultTodayTemplate;

    console.log('📋 템플릿 로드:', {
      d1: d1Template.title,
      today: todayTemplate.title,
      d1Active: d1Template.is_active,
      todayActive: todayTemplate.is_active,
    });

    // ===== D-1 알림 (내일 수거 예정) =====
    if ((reminderType === 'D-1' || reminderType === 'ALL') && d1Template.is_active) {
      console.log('📦 D-1 알림 대상 조회 중... (내일:', tomorrowStr, ')');
      
      // 단순 조인으로 변경 (중첩 조인 문제 해결)
      const { data: d1Targets, error: d1Error } = await supabase
        .from('shipments')
        .select(`
          id,
          order_id,
          tracking_no,
          pickup_scheduled_date,
          customer_name,
          pickup_address,
          orders!inner (
            user_id,
            status
          )
        `)
        .eq('pickup_scheduled_date', tomorrowStr)
        .eq('status', 'BOOKED')
        .is('pickup_reminder_sent_at', null);

      if (d1Error) {
        console.error('❌ D-1 대상 조회 실패:', d1Error);
      } else {
        console.log(`📋 D-1 알림 대상: ${d1Targets?.length || 0}건`);

        for (const target of d1Targets || []) {
          try {
            if (isInactiveOrder(target as any)) {
              console.log('⏭️ 취소된 주문 D-1 알림 스킵:', target.order_id);
              continue;
            }
            const userId = (target.orders as any)?.user_id;
            
            // user의 fcm_token 별도 조회
            let fcmToken: string | null = null;
            if (userId) {
              const { data: userData } = await supabase
                .from('users')
                .select('fcm_token')
                .eq('id', userId)
                .single();
              fcmToken = userData?.fcm_token || null;
            }

            // 템플릿 변수 치환
            const pickupDateStr = formatKoreanDate(tomorrowStr);
            const d1Title = replaceTemplateVariables(d1Template.title, { pickup_date: pickupDateStr });
            const d1Body = replaceTemplateVariables(d1Template.body, { pickup_date: pickupDateStr });

            // 1. notifications 테이블에 알림 생성
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                order_id: target.order_id,
                type: 'pickup_reminder',
                title: d1Title,
                body: d1Body,
                metadata: {
                  tracking_no: target.tracking_no,
                  pickup_date: target.pickup_scheduled_date,
                  reminder_type: 'D-1',
                },
              });

            if (notifError) {
              console.error('❌ D-1 알림 생성 실패:', target.order_id, notifError);
              results.d1.failed++;
              continue;
            }

            // 2. FCM 푸시 발송 (토큰이 있는 경우)
            if (fcmToken) {
              try {
                await sendFCMNotification(fcmToken, {
                  title: d1Title,
                  body: d1Body,
                  data: {
                    order_id: target.order_id,
                    tracking_no: target.tracking_no,
                    type: 'pickup_reminder',
                  },
                });
                console.log('✅ D-1 FCM 발송 성공:', target.order_id);
              } catch (fcmError) {
                console.warn('⚠️ D-1 FCM 발송 실패 (알림은 생성됨):', fcmError);
              }
            }

            // 3. 발송 이력 업데이트
            await supabase
              .from('shipments')
              .update({ pickup_reminder_sent_at: new Date().toISOString() })
              .eq('id', target.id);

            results.d1.sent++;
            results.d1.targets.push(target.order_id);
            console.log('✅ D-1 알림 완료:', target.order_id);

          } catch (err) {
            console.error('❌ D-1 알림 처리 실패:', target.order_id, err);
            results.d1.failed++;
          }
        }
      }
    }

    // ===== 당일 알림 (오늘 수거 예정) =====
    if ((reminderType === 'TODAY' || reminderType === 'ALL') && todayTemplate.is_active) {
      console.log('🚚 당일 알림 대상 조회 중... (오늘:', today, ')');
      
      // 단순 조인으로 변경 (중첩 조인 문제 해결)
      const { data: todayTargets, error: todayError } = await supabase
        .from('shipments')
        .select(`
          id,
          order_id,
          tracking_no,
          pickup_scheduled_date,
          customer_name,
          pickup_address,
          orders!inner (
            user_id,
            status
          )
        `)
        .eq('pickup_scheduled_date', today)
        .eq('status', 'BOOKED')
        .is('pickup_day_reminder_sent_at', null);

      if (todayError) {
        console.error('❌ 당일 대상 조회 실패:', todayError);
      } else {
        console.log(`📋 당일 알림 대상: ${todayTargets?.length || 0}건`);

        for (const target of todayTargets || []) {
          try {
            if (isInactiveOrder(target as any)) {
              console.log('⏭️ 취소된 주문 당일 알림 스킵:', target.order_id);
              continue;
            }
            const userId = (target.orders as any)?.user_id;
            
            // user의 fcm_token 별도 조회
            let fcmToken: string | null = null;
            if (userId) {
              const { data: userData } = await supabase
                .from('users')
                .select('fcm_token')
                .eq('id', userId)
                .single();
              fcmToken = userData?.fcm_token || null;
            }

            // 템플릿 사용 (당일 알림은 변수 없음)
            const todayTitle = todayTemplate.title;
            const todayBody = todayTemplate.body;

            // 1. notifications 테이블에 알림 생성
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: userId,
                order_id: target.order_id,
                type: 'pickup_today',
                title: todayTitle,
                body: todayBody,
                metadata: {
                  tracking_no: target.tracking_no,
                  pickup_date: target.pickup_scheduled_date,
                  reminder_type: 'TODAY',
                },
              });

            if (notifError) {
              console.error('❌ 당일 알림 생성 실패:', target.order_id, notifError);
              results.today.failed++;
              continue;
            }

            // 2. FCM 푸시 발송 (토큰이 있는 경우)
            if (fcmToken) {
              try {
                await sendFCMNotification(fcmToken, {
                  title: todayTitle,
                  body: todayBody,
                  data: {
                    order_id: target.order_id,
                    tracking_no: target.tracking_no,
                    type: 'pickup_today',
                  },
                });
                console.log('✅ 당일 FCM 발송 성공:', target.order_id);
              } catch (fcmError) {
                console.warn('⚠️ 당일 FCM 발송 실패 (알림은 생성됨):', fcmError);
              }
            }

            // 3. 발송 이력 업데이트
            await supabase
              .from('shipments')
              .update({ pickup_day_reminder_sent_at: new Date().toISOString() })
              .eq('id', target.id);

            results.today.sent++;
            results.today.targets.push(target.order_id);
            console.log('✅ 당일 알림 완료:', target.order_id);

          } catch (err) {
            console.error('❌ 당일 알림 처리 실패:', target.order_id, err);
            results.today.failed++;
          }
        }
      }
    }

    // 결과 반환
    const totalSent = results.d1.sent + results.today.sent;
    const totalFailed = results.d1.failed + results.today.failed;

    console.log('🔔 수거일 알림 발송 완료:', {
      d1: results.d1,
      today: results.today,
      total: { sent: totalSent, failed: totalFailed },
    });

    return successResponse({
      success: true,
      message: `수거일 알림 발송 완료: ${totalSent}건 성공, ${totalFailed}건 실패`,
      results: {
        d1: {
          sent: results.d1.sent,
          failed: results.d1.failed,
          date: tomorrowStr,
        },
        today: {
          sent: results.today.sent,
          failed: results.today.failed,
          date: today,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 수거일 알림 발송 오류:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

