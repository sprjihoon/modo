import { buildMarketingActions, daysSince, isDeletedCustomer, lastActivityAt } from "./marketing-actions";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isDeletedCustomer("deleted_1@deleted.modorepair.com"), "탈퇴 이메일");
assert(!isDeletedCustomer("user@naver.com"), "일반 이메일");

const now = Date.parse("2026-09-01T06:00:00.000Z");
assert(daysSince("2026-08-02T06:00:00.000Z", now) === 30, "30일");
assert(
  lastActivityAt({
    created_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-08-01T00:00:00.000Z",
    last_paid_at: "2026-07-01T00:00:00.000Z",
  }) === "2026-08-01T00:00:00.000Z",
  "최근 활동은 접속"
);

const data = buildMarketingActions({
  nowMs: now,
  users: [
    { id: "u1", name: "휴면", email: "a@a.com", phone: "0101", created_at: "2026-01-01T00:00:00.000Z" },
    { id: "u2", name: "1회", email: "b@b.com", phone: "0102", created_at: "2026-06-01T00:00:00.000Z" },
    { id: "u3", name: "이탈", email: "c@c.com", phone: "0103", created_at: "2026-08-20T00:00:00.000Z" },
    { id: "u4", name: "탈퇴", email: "deleted_x@deleted.modorepair.com", created_at: "2026-01-01T00:00:00.000Z" },
    { id: "u5", name: "활성", email: "d@d.com", created_at: "2026-08-30T00:00:00.000Z" },
  ],
  orders: [
    {
      user_id: "u2",
      paid_at: "2026-07-01T00:00:00.000Z",
      created_at: "2026-07-01T00:00:00.000Z",
      total_price: 20000,
      payment_status: "PAID",
    },
    {
      id: "o2",
      user_id: "u5",
      paid_at: "2026-08-31T00:00:00.000Z",
      created_at: "2026-08-31T00:00:00.000Z",
      total_price: 15000,
      payment_status: "PAID",
      promotion_code_id: "p3",
      promotion_discount_amount: 2000,
    },
  ],
  lastSeen: [
    { user_id: "u1", created_at: "2026-07-01T00:00:00.000Z" },
    { user_id: "u5", created_at: "2026-08-31T12:00:00.000Z", device_os: "iOS 18.0", app_version: "1.2.0" },
  ],
  abandonEvents: [
    { user_id: "u3", created_at: "2026-08-28T00:00:00.000Z", event_type: "CART_ADD" },
    { user_id: "u5", created_at: "2026-08-30T00:00:00.000Z", event_type: "CART_ADD" },
    { user_id: "u5", created_at: "2026-08-31T00:00:00.000Z", event_type: "ORDER_PAYMENT_SUCCESS" },
  ],
  promotions: [
    { id: "p1", code: "WELCOME", description: "첫 결제", is_active: true },
    { id: "p2", code: "UNUSED", description: null, is_active: true },
    { id: "p3", code: "FR", description: "주문만 있는 코드", is_active: true, used_count: 0 },
  ],
  usages: [
    {
      promotion_code_id: "p1",
      user_id: "u2",
      order_id: "o1",
      discount_amount: 3000,
      final_amount: 17000,
      original_amount: 20000,
      used_at: "2026-07-01T00:00:00.000Z",
    },
  ],
});

assert(data.counts.quiet30 >= 1 && data.quiet30.some((c) => c.id === "u1"), "30일 휴면");
assert(data.quiet60.some((c) => c.id === "u1"), "60일 휴면");
assert(data.oneShot.some((c) => c.id === "u2"), "1회 구매");
assert(data.abandon.some((c) => c.id === "u3"), "장바구니 이탈");
assert(!data.abandon.some((c) => c.id === "u5"), "결제한 사람은 이탈 아님");
assert(!data.quiet30.some((c) => c.id === "u4"), "탈퇴 제외");
assert(data.coupons.find((c) => c.code === "WELCOME")?.uses === 1, "쿠폰 사용");
assert(data.coupons.find((c) => c.code === "WELCOME")?.new_customers === 1, "쿠폰 신규");
assert(data.coupons.find((c) => c.code === "WELCOME")?.revenue === 17000, "쿠폰 매출");
const fromOrder = data.coupons.find((c) => c.code === "FR");
assert(fromOrder?.uses === 1 && fromOrder.revenue === 15000 && fromOrder.discount === 2000, "주문 기준 쿠폰 성적");
assert(data.appOnly.some((c) => c.id === "u5"), "앱만");
assert(data.counts.appOnly >= 1, "앱만 집계");

console.log("marketing-actions.test.ts ok");
