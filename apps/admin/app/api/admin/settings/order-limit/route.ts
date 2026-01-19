import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 일일 주문 제한량 조회
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("company_info")
      .select("daily_order_limit, order_limit_message")
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 오늘 주문 수 조회
    const today = new Date().toISOString().split('T')[0];
    const { count: todayOrderCount } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lt("created_at", `${today}T23:59:59+09:00`)
      .neq("status", "CANCELLED");

    // 대기자 수 조회
    const { count: waitlistCount } = await supabaseAdmin
      .from("order_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("request_date", today)
      .eq("status", "waiting");

    return NextResponse.json({ 
      success: true, 
      data: {
        daily_order_limit: data?.daily_order_limit ?? null,
        order_limit_message: data?.order_limit_message ?? '오늘 하루 처리 가능한 주문량이 다 찼어요. 알림 신청하시면 접수 가능할 때 알려드릴게요!',
        today_order_count: todayOrderCount ?? 0,
        waitlist_count: waitlistCount ?? 0,
        is_limited: data?.daily_order_limit ? (todayOrderCount ?? 0) >= data.daily_order_limit : false,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: 일일 주문 제한량 저장
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 기존 레코드 확인
    const { data: existingData } = await supabaseAdmin
      .from("company_info")
      .select("id")
      .limit(1)
      .maybeSingle();
    
    const payload = {
      daily_order_limit: body.daily_order_limit === '' || body.daily_order_limit === null 
        ? null 
        : parseInt(body.daily_order_limit),
      order_limit_message: body.order_limit_message || '오늘 하루 처리 가능한 주문량이 다 찼어요. 알림 신청하시면 접수 가능할 때 알려드릴게요!',
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingData?.id) {
      // 기존 레코드 업데이트
      result = await supabaseAdmin
        .from("company_info")
        .update(payload)
        .eq("id", existingData.id);
    } else {
      // 새 레코드 생성
      result = await supabaseAdmin
        .from("company_info")
        .insert(payload);
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: 대기자에게 푸시 알림 발송 후 대기자 목록 초기화
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'notify-waitlist') {
      // 대기자에게 푸시 알림 발송
      const today = new Date().toISOString().split('T')[0];
      
      // 대기 중인 사용자 목록 조회
      const { data: waitlistUsers, error: fetchError } = await supabaseAdmin
        .from("order_waitlist")
        .select(`
          id,
          user_id,
          fcm_token,
          users!inner(fcm_token)
        `)
        .eq("request_date", today)
        .eq("status", "waiting");

      if (fetchError) throw fetchError;

      // Edge Function 호출하여 푸시 발송
      const notifiedIds: string[] = [];
      for (const user of waitlistUsers || []) {
        const fcmToken = user.fcm_token || (user.users as any)?.fcm_token;
        if (!fcmToken) continue;

        try {
          // send-push-notification Edge Function 호출
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                userId: user.user_id,
                fcmToken: fcmToken,
                title: '🎉 접수 가능해요!',
                body: '수선 서비스가 지금 접수 가능합니다. 지금 바로 신청해보세요!',
                data: { type: 'ORDER_AVAILABLE' },
              }),
            }
          );

          if (response.ok) {
            notifiedIds.push(user.id);
          }
        } catch (pushError) {
          console.error('푸시 발송 실패:', user.id, pushError);
        }
      }

      // 발송 완료된 대기자 상태 업데이트
      if (notifiedIds.length > 0) {
        await supabaseAdmin
          .from("order_waitlist")
          .update({ 
            status: 'notified', 
            notified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("id", notifiedIds);
      }

      return NextResponse.json({ 
        success: true, 
        notified_count: notifiedIds.length,
        total_waitlist: waitlistUsers?.length || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

