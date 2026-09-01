import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import {
  buildAnnouncementSendMessage,
  canRetryAnnouncementSend,
  parseAnnouncementPushResult,
} from "@/lib/announcement-send";
import { isSegmentAudience, resolveAudienceUserIds } from "@/lib/marketing-audience";
import { loadMarketingActions } from "@/lib/marketing-actions-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  status: string;
  send_push: boolean | null;
  target_audience: string | null;
  image_url: string | null;
  link_url: string | null;
  sent_at: string | null;
};

async function trySendAnnouncementPush(
  announcement: AnnouncementRow,
  userIds?: string[]
): Promise<{
  total: number;
  success: number;
  failed: number;
  error: string | null;
}> {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      error: "푸시 서버 설정이 없습니다",
    };
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/send-announcement-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          announcementId: announcement.id,
          title: announcement.title,
          content: announcement.content,
          targetAudience: announcement.target_audience,
          imageUrl: announcement.image_url,
          linkUrl: announcement.link_url,
          userIds,
        }),
      }
    );

    const data = (await res.json().catch(() => ({}))) as {
      total?: number;
      sent_count?: number;
      success?: number;
      failed?: number;
      error?: string;
    };

    if (!res.ok) {
      const statusHint =
        res.status === 404
          ? "푸시 함수가 배포되어 있지 않습니다"
          : data.error || `푸시 함수 오류 (${res.status})`;
      return { total: 0, success: 0, failed: 0, error: statusHint };
    }

    return parseAnnouncementPushResult(data);
  } catch (e) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      error: e instanceof Error ? e.message : "푸시 함수 호출 실패",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const announcementId = String(body.announcementId ?? "").trim();

    if (!announcementId) {
      return NextResponse.json(
        { success: false, error: "공지사항 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { data: announcement, error: loadError } = await supabaseAdmin
      .from("announcements")
      .select(
        "id, title, content, status, send_push, target_audience, image_url, link_url, sent_at"
      )
      .eq("id", announcementId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { success: false, error: loadError.message },
        { status: 500 }
      );
    }

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "공지사항을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (!canRetryAnnouncementSend(announcement.status)) {
      return NextResponse.json(
        { success: false, error: "게시할 수 없는 상태입니다" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let push = {
      total: 0,
      success: 0,
      failed: 0,
      error: null as string | null,
    };

    if (announcement.send_push) {
      let userIds: string[] | undefined;
      if (isSegmentAudience(announcement.target_audience)) {
        const { actions } = await loadMarketingActions();
        userIds = resolveAudienceUserIds(announcement.target_audience || "", actions);
      }
      push = await trySendAnnouncementPush(announcement, userIds);
    }

    // 푸시 성공/실패와 무관하게 sent로 고정해야 앱/웹 공지 탭에 노출된다.
    const { error: publishError } = await supabaseAdmin
      .from("announcements")
      .update({
        status: "sent",
        sent_at: announcement.sent_at || now,
        updated_by: auth.user.id,
        ...(announcement.send_push
          ? {
              total_recipients: push.total,
              push_sent_count: push.success,
              push_failed_count: push.failed,
            }
          : {}),
      })
      .eq("id", announcementId);

    if (publishError) {
      return NextResponse.json(
        { success: false, error: publishError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      published: true,
      total: push.total,
      sentCount: push.success,
      failed: push.failed,
      pushError: push.error,
      message: buildAnnouncementSendMessage({
        sendPush: !!announcement.send_push,
        total: push.total,
        success: push.success,
        failed: push.failed,
        pushError: push.error,
      }),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "공지 게시에 실패했습니다";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
