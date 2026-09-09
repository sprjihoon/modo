import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isDeliverableEmail,
  ORDER_EMAIL_FROM,
  OUT_FOR_DELIVERY_TEMPLATE,
  orderStatusEmailSubject,
  orderStatusFallbackMessage,
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
assert(
  orderStatusEmailSubject(OUT_FOR_DELIVERY_TEMPLATE.title) === "[모두의수선] 배송 시작",
  "배송 시작 메일 제목"
);
assert(ORDER_EMAIL_FROM === "모두의수선 <noreply@modo.mom>", "발신 주소");

const shipping = orderStatusFallbackMessage("OUT_FOR_DELIVERY", "ORD-TEST-1");
assert(shipping.title === "배송 시작", "배송 시작 제목");
assert(
  shipping.body === "주문(ORD-TEST-1)의 수선이 완료되어 고객님께 배송을 시작했습니다.",
  "배송 시작 본문"
);
assert(!shipping.title.includes("?"), "배송 시작 제목에 깨진 문자 없음");
assert(!shipping.body.includes("?"), "배송 시작 본문에 깨진 문자 없음");

const inbound = orderStatusFallbackMessage("INBOUND", "ORD-2");
assert(inbound.title === "입고 완료", "입고 제목");
assert(inbound.body.includes("ORD-2"), "입고 본문에 주문번호");

const sql = readFileSync(
  join(__dirname, "../../sql/migrations/fix_order_out_for_delivery_template.sql"),
  "utf8"
);
const hexes = [...sql.matchAll(/decode\(\s*'([0-9a-f]+)'\s*,\s*'hex'\s*\)/gi)].map((m) => m[1]);
assert(hexes.length >= 2, "복구 SQL에 title/body hex가 있어야 함");
assert(
  Buffer.from(hexes[0], "hex").toString("utf8") === OUT_FOR_DELIVERY_TEMPLATE.title,
  "SQL title hex가 배송 시작"
);
assert(
  Buffer.from(hexes[hexes.length - 1], "hex").toString("utf8") === OUT_FOR_DELIVERY_TEMPLATE.body,
  "SQL body hex가 템플릿 본문"
);

console.log("order-email tests passed");
