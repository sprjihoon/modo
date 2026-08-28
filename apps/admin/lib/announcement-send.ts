export const PUBLISHABLE_ANNOUNCEMENT_STATUSES = [
  "draft",
  "failed",
  "sending",
] as const;

export function canRetryAnnouncementSend(status: string): boolean {
  return (
    status === "sent" ||
    PUBLISHABLE_ANNOUNCEMENT_STATUSES.includes(
      status as (typeof PUBLISHABLE_ANNOUNCEMENT_STATUSES)[number]
    )
  );
}

export function announcementSendButtonLabel(status: string): string {
  return status === "sent" ? "푸시 재발송" : "게시/발송";
}

export function buildAnnouncementSendMessage(opts: {
  sendPush: boolean;
  total: number;
  success: number;
  failed: number;
  pushError: string | null;
}): string {
  const lines = ["공지사항이 앱/웹에 게시되었습니다."];

  if (!opts.sendPush) {
    lines.push("푸시 알림은 꺼져 있어 발송하지 않았습니다.");
    return lines.join("\n");
  }

  if (opts.pushError) {
    lines.push(`푸시 알림은 발송하지 못했습니다: ${opts.pushError}`);
    return lines.join("\n");
  }

  lines.push(
    `푸시: 총 ${opts.total}명 중 ${opts.success}명 성공, ${opts.failed}명 실패`
  );
  return lines.join("\n");
}

export function parseAnnouncementPushResult(data: {
  total?: number;
  sent_count?: number;
  success?: number;
  failed?: number;
  error?: string;
}): {
  total: number;
  success: number;
  failed: number;
  error: string | null;
} {
  return {
    total: data.total ?? 0,
    success: data.sent_count ?? data.success ?? 0,
    failed: data.failed ?? 0,
    error: data.error ?? null,
  };
}
