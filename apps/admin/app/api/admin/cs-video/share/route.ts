import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";

/**
 * POST /api/admin/cs-video/share
 *
 * CS용 영상 링크를 고객에게 앱 푸시 알림으로 전송합니다.
 * 영상 자체는 공개하지 않고, 알림을 통해 요청한 고객에게만 전달합니다.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const body = await req.json();
    const {
      orderId,
      videoId,     // Cloudflare Stream video path
      videoType,   // "box_open_video" | "outbound_video" | "inbound_video"
      videoLabel,  // 표시용 이름 (예: "입고 오픈박스 영상")
    } = body as {
      orderId: string;
      videoId: string;
      videoType: string;
      videoLabel?: string;
    };

    if (!orderId || !videoId) {
      return NextResponse.json(
        { error: "orderId, videoId는 필수입니다" },
        { status: 400 }
      );
    }

    // 주문 + 고객 user_id 조회
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, customer_name, order_number")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
    }

    if (!order.user_id) {
      return NextResponse.json(
        { error: "해당 주문에 연결된 고객 계정이 없습니다 (비회원 주문)" },
        { status: 400 }
      );
    }

    // 영상 URL 구성
    const videoUrl = `https://iframe.videodelivery.net/${videoId}`;
    const label = videoLabel || getDefaultLabel(videoType);
    const orderNum = order.order_number || order.id.slice(-8);

    const notifTitle = "📹 CS 영상이 도착했습니다";
    const notifBody = `${label}을 확인하실 수 있습니다. (주문번호: ${orderNum})`;

    // notifications 테이블에 저장
    const { data: notification, error: notifErr } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: order.user_id,
        type: "CS_VIDEO_SHARED",
        title: notifTitle,
        body: notifBody,
        order_id: orderId,
        metadata: {
          video_url: videoUrl,
          video_id: videoId,
          video_type: videoType,
          video_label: label,
        },
      })
      .select()
      .single();

    if (notifErr) {
      console.error("알림 저장 실패:", notifErr);
      return NextResponse.json({ error: "알림 저장 실패" }, { status: 500 });
    }

    // FCM 푸시 전송
    let fcmSent = false;
    try {
      const { data: userRow } = await supabaseAdmin
        .from("users")
        .select("fcm_token")
        .eq("id", order.user_id)
        .maybeSingle();

      if (userRow?.fcm_token) {
        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const pushRes = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              userId: order.user_id,
              title: notifTitle,
              body: notifBody,
              data: {
                type: "CS_VIDEO_SHARED",
                order_id: orderId,
                notification_id: notification.id,
                video_url: videoUrl,
                video_type: videoType,
              },
            }),
          }
        );

        if (pushRes.ok) {
          fcmSent = true;
        }
      }
    } catch (fcmErr) {
      console.warn("FCM 전송 실패 (알림은 DB에 저장됨):", fcmErr);
    }

    return NextResponse.json({
      success: true,
      notification,
      fcmSent,
      message: fcmSent
        ? "고객에게 앱 푸시 알림이 전송되었습니다"
        : "알림이 저장되었습니다 (앱 미설치 또는 FCM 토큰 없음)",
    });
  } catch (e: any) {
    console.error("CS 영상 공유 오류:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}

function getDefaultLabel(videoType: string): string {
  switch (videoType) {
    case "box_open_video":
      return "입고 오픈박스 영상";
    case "outbound_video":
      return "출고 패킹 영상";
    case "inbound_video":
      return "입고 영상";
    case "work_video":
      return "작업 영상";
    default:
      return "CS 영상";
  }
}
