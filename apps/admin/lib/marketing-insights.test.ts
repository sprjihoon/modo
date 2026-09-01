import { buildMarketingInsights, isPaidOrder, kstParts } from "./marketing-insights";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isPaidOrder({ payment_status: "PAID" }), "PAID는 결제");
assert(!isPaidOrder({ payment_status: "PENDING" }), "PENDING은 결제 아님");
assert(isPaidOrder({ paid_at: "2026-09-01T05:00:00.000Z" }), "paid_at 있으면 결제");

const wed14 = "2026-09-02T05:10:00.000Z"; // KST 수 14:10
assert(kstParts(wed14).weekday === 3 && kstParts(wed14).hour === 14, "KST 수요일 14시");

const data = buildMarketingInsights({
  startDate: "2026-09-01",
  endDate: "2026-09-07",
  orders: [
    {
      paid_at: wed14,
      created_at: wed14,
      total_price: 17000,
      payment_status: "PAID",
      clothing_type: "바지",
      repair_type: "기장",
      order_source: "ios",
      user_id: "u1",
    },
    {
      paid_at: "2026-09-05T04:00:00.000Z",
      created_at: "2026-09-05T04:00:00.000Z",
      total_price: 20000,
      payment_status: "PAID",
      clothing_type: "바지",
      repair_type: "기장",
      order_source: "web",
      user_id: "u2",
    },
  ],
  users: [{ created_at: wed14 }],
  events: [
    { created_at: "2026-09-05T01:00:00.000Z", user_id: "u3" },
    { created_at: "2026-09-05T02:00:00.000Z", user_id: "u4" },
  ],
});

assert(data.totals.paidOrders === 2, "결제 2건");
assert(data.paymentsByWeekday[3].count === 1, "수요일 결제 1");
assert(data.paymentsByHour[14].count === 1, "14시 결제 1");
assert(data.insights.some((i) => i.title === "결제 피크 요일"), "피크 요일 인사이트");
assert(data.clothing[0].name === "바지", "의류 집계");

console.log("marketing-insights.test.ts ok");
