import {
  announcementSendButtonLabel,
  buildAnnouncementSendMessage,
  canRetryAnnouncementSend,
  parseAnnouncementPushResult,
} from "./announcement-send";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(canRetryAnnouncementSend("draft") === true, "임시저장 게시 가능");
assert(canRetryAnnouncementSend("failed") === true, "실패건 재게시 가능");
assert(canRetryAnnouncementSend("sending") === true, "발송중 재게시 가능");
assert(canRetryAnnouncementSend("sent") === true, "게시된 공지 푸시 재발송 가능");
assert(canRetryAnnouncementSend("scheduled") === false, "예약 상태는 직접 게시 불가");

assert(announcementSendButtonLabel("draft") === "게시/발송", "초안 버튼");
assert(announcementSendButtonLabel("sent") === "푸시 재발송", "게시됨 버튼");

const publishedOnly = buildAnnouncementSendMessage({
  sendPush: false,
  total: 0,
  success: 0,
  failed: 0,
  pushError: null,
});
assert(publishedOnly.includes("앱/웹에 게시"), "게시 안내");
assert(publishedOnly.includes("푸시 알림은 꺼져"), "푸시 생략 안내");

const pushFailed = buildAnnouncementSendMessage({
  sendPush: true,
  total: 0,
  success: 0,
  failed: 0,
  pushError: "푸시 함수가 배포되어 있지 않습니다",
});
assert(pushFailed.includes("앱/웹에 게시"), "푸시 실패해도 게시는 성공");
assert(pushFailed.includes("배포되어 있지 않습니다"), "푸시 오류 전달");

const pushOk = buildAnnouncementSendMessage({
  sendPush: true,
  total: 10,
  success: 8,
  failed: 2,
  pushError: null,
});
assert(pushOk.includes("총 10명 중 8명 성공"), "푸시 통계");

const parsed = parseAnnouncementPushResult({
  total: 5,
  sent_count: 4,
  failed: 1,
});
assert(parsed.success === 4, "sent_count를 성공 수로 사용");
assert(parsed.failed === 1, "실패 수");

const parsedLegacy = parseAnnouncementPushResult({ success: 3, total: 3 });
assert(parsedLegacy.success === 3, "legacy success 필드");

console.log("announcement-send.test.ts ok");
