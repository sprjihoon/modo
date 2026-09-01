import { attachLoyalty, buildRegionStats, buildRepeatStats, parseRegion } from "./marketing-loyalty";
import { buildMarketingInsights } from "./marketing-insights";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(parseRegion("서울 강남구 테헤란로 1") === "서울", "서울");
assert(parseRegion("경기도 성남시 분당구") === "경기", "경기");
assert(parseRegion("제주특별자치도 제주시") === "제주", "제주");
assert(parseRegion("") === "주소 없음", "빈 주소");

const now = Date.parse("2026-09-01T00:00:00.000Z");
const repeat = buildRepeatStats({
  nowMs: now,
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  orders: [
    { user_id: "a", paid_at: "2026-06-01T00:00:00.000Z", created_at: "2026-06-01T00:00:00.000Z", total_price: 10000, payment_status: "PAID" },
    { user_id: "a", paid_at: "2026-08-10T00:00:00.000Z", created_at: "2026-08-10T00:00:00.000Z", total_price: 20000, payment_status: "PAID" },
    { user_id: "b", paid_at: "2026-08-15T00:00:00.000Z", created_at: "2026-08-15T00:00:00.000Z", total_price: 15000, payment_status: "PAID" },
    { user_id: "c", paid_at: "2026-07-01T00:00:00.000Z", created_at: "2026-07-01T00:00:00.000Z", total_price: 12000, payment_status: "PAID" },
  ],
});

assert(repeat.firstBuyers === 1, "기간 첫 구매자 b");
assert(repeat.repeatBuyers === 1, "기간 재구매 a");
assert(repeat.avgDaysToSecond === 70, "1차~2차 70일");
assert(repeat.dueForSecond === 1, "c는 30일 넘김");
assert(repeat.repeatRate === 50, "기간 결제자 2명 중 1명 재구매 이력");

const regions = buildRegionStats({
  orders: [
    { user_id: "a", paid_at: "2026-08-10T00:00:00.000Z", created_at: "2026-08-10T00:00:00.000Z", total_price: 20000, payment_status: "PAID", pickup_address: "서울 마포구" },
    { user_id: "b", paid_at: "2026-08-15T00:00:00.000Z", created_at: "2026-08-15T00:00:00.000Z", total_price: 15000, payment_status: "PAID", pickup_address: "경기도 용인시" },
    { user_id: "a", paid_at: "2026-08-20T00:00:00.000Z", created_at: "2026-08-20T00:00:00.000Z", total_price: 10000, payment_status: "PAID", pickup_address: "서울시 강남구" },
  ],
});
assert(regions[0].name === "서울" && regions[0].count === 2, "서울 2건");
assert(regions[1].name === "경기", "경기");

const data = attachLoyalty(
  buildMarketingInsights({ startDate: "2026-08-01", endDate: "2026-08-31", orders: [], users: [], events: [] }),
  [
    { user_id: "a", paid_at: "2026-08-10T00:00:00.000Z", created_at: "2026-08-10T00:00:00.000Z", total_price: 20000, payment_status: "PAID", pickup_address: "서울 마포구" },
  ],
  { startDate: "2026-08-01", endDate: "2026-08-31" }
);
assert(data.regions[0].name === "서울", "attach 지역");
assert(data.insights.some((item) => item.title === "제일 많은 지역"), "지역 인사이트");

console.log("marketing-loyalty.test.ts ok");
