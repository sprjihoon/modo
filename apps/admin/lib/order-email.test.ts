import {
  isDeliverableEmail,
  orderStatusEmailSubject,
  resolveOrderNotifyEmail,
} from "./order-email";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isDeliverableEmail("user@gmail.com") === true, "일반 가입 이메일");
assert(isDeliverableEmail("  user@Gmail.com  ") === true, "대소문자·공백");
assert(isDeliverableEmail("oauth_abc@noemail.local") === false, "OAuth 플레이스홀더");
assert(isDeliverableEmail("test@example.com") === false, "example.com 제외");
assert(isDeliverableEmail("not-an-email") === false, "형식 오류");
assert(isDeliverableEmail("") === false, "빈 문자열");
assert(isDeliverableEmail(null) === false, "null");

assert(
  resolveOrderNotifyEmail({
    userEmail: "oauth_1@noemail.local",
    orderEmail: "customer@naver.com",
  }) === "customer@naver.com",
  "가입 이메일이 가짜면 주문 이메일"
);
assert(
  resolveOrderNotifyEmail({
    userEmail: "member@modo.io.kr",
    orderEmail: "other@naver.com",
  }) === "member@modo.io.kr",
  "가입 이메일 우선"
);
assert(
  resolveOrderNotifyEmail({
    userEmail: "oauth_1@noemail.local",
    orderEmail: "x@example.com",
  }) === null,
  "둘 다 플레이스홀더면 발송 안 함"
);

assert(orderStatusEmailSubject("입고 완료") === "[모두의수선] 입고 완료", "메일 제목");

console.log("order-email tests passed");
