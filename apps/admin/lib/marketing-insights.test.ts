import { buildMarketingInsights, classifyAccessPath, compareDailyPeriods, isPaidOrder, kstParts, previousPeriod } from "./marketing-insights";

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
    { created_at: "2026-09-05T01:00:00.000Z", user_id: "u3", referrer: "https://m.search.naver.com/search", session_id: "s1", device_os: "웹 (Android)", app_version: "web" },
    { created_at: "2026-09-05T02:00:00.000Z", user_id: "u4", referrer: "https://www.instagram.com/", session_id: "s2", device_os: "웹 (iOS)", app_version: "web" },
    { created_at: "2026-09-05T03:00:00.000Z", user_id: "u5", device_os: "iOS 18.0", app_version: "1.2.0", session_id: "s3" },
  ],
});

assert(data.totals.paidOrders === 2, "결제 2건");
assert(data.paymentsByWeekday[3].count === 1, "수요일 결제 1");
assert(data.paymentsByHour[14].count === 1, "14시 결제 1");
assert(data.insights.some((i) => i.title === "결제 피크 요일"), "피크 요일 인사이트");
assert(data.clothing[0].name === "바지", "의류 집계");
assert(data.daily.length === 7, "기간 7일 달력");
const wed = data.daily.find((d) => d.date === "2026-09-02");
assert(wed?.signups === 1 && wed.payers === 1, "수요일 가입·결제자");
const sat = data.daily.find((d) => d.date === "2026-09-05");
assert(sat?.visitors === 3 && sat.payers === 1, "토요일 접속·결제자");
assert(classifyAccessPath({ referrer: "https://search.naver.com/search.naver" }) === "네이버", "네이버 referrer");
assert(classifyAccessPath({ page_url: "/?utm_source=instagram" }) === "인스타그램", "인스타 UTM");
assert(classifyAccessPath({ referrer: "https://www.google.com/" }) === "구글", "구글 referrer");
assert(classifyAccessPath({ device_os: "iOS 18.0", app_version: "1.2.0" }) === "앱 · iOS", "앱 iOS");
assert(data.accessPaths[0].name === "네이버" || data.accessPaths.some((p) => p.name === "네이버"), "네이버 접속 경로");
assert(data.accessPaths.find((p) => p.name === "앱 · iOS")?.sessions === 1, "앱 세션");
assert(previousPeriod("2026-09-08", "2026-09-14")?.start === "2026-09-01", "직전 기간");
const cmp = compareDailyPeriods(data.daily, "2026-09-01", "2026-09-07");
assert(cmp && cmp.current.payments === 2, "기간 결제 합");

console.log("marketing-insights.test.ts ok");
