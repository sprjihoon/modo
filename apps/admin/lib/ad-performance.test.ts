import {
  acquisitionFromEvent,
  allocateSpend,
  buildAdPerformance,
  isDeletedCustomerEmail,
  normalizeSource,
  overlapDays,
  verdictFor,
} from "./ad-performance";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(normalizeSource("naver").label === "네이버", "naver 별칭");
assert(normalizeSource("인스타그램").key === "instagram", "인스타 키");
assert(normalizeSource("youtube").label === "유튜브", "유튜브");
assert(isDeletedCustomerEmail("deleted_x@deleted.modorepair.com"), "탈퇴 이메일");
assert(!isDeletedCustomerEmail("user@naver.com"), "일반 이메일");
assert(overlapDays("2026-09-01", "2026-09-10", "2026-09-08", "2026-09-14") === 3, "겹치는 3일");

const spent = allocateSpend(
  [
    { source: "naver", campaign: "수선_검색", start_date: "2026-09-01", end_date: "2026-09-10", amount: 100000 },
    { source: "instagram", campaign: "", start_date: "2026-09-01", end_date: "2026-09-10", amount: 50000 },
  ],
  "2026-09-01",
  "2026-09-10"
);
assert(spent.total === 150000, "광고비 합");
assert(spent.channel.get("naver") === 100000, "네이버 채널 광고비");
assert(spent.campaign.get("naver\t수선_검색") === 100000, "캠페인 광고비");
assert(!spent.campaign.has("instagram\t(캠페인 없음)"), "채널만 있는 광고비는 캠페인에 안 넣음");

const acq = acquisitionFromEvent({
  created_at: "2026-09-02T00:00:00.000Z",
  user_id: "u1",
  page_url: "/?utm_source=naver&utm_campaign=수선_검색&utm_term=택배수선",
  metadata: { utm_source: "naver", utm_campaign: "수선_검색", utm_term: "택배수선" },
});
assert(acq.sourceKey === "naver" && acq.campaign === "수선_검색", "이벤트 UTM");

const data = buildAdPerformance({
  startDate: "2026-09-01",
  endDate: "2026-09-07",
  users: [
    {
      id: "u1",
      created_at: "2026-09-02T01:00:00.000Z",
      acq_source: "naver",
      acq_campaign: "수선_검색",
    },
    {
      id: "u2",
      created_at: "2026-09-03T01:00:00.000Z",
      acq_source: "instagram",
      acq_campaign: "릴스A",
    },
    {
      id: "u3",
      created_at: "2026-08-01T01:00:00.000Z",
      acq_source: "naver",
      acq_campaign: "수선_검색",
    },
    {
      id: "deleted",
      email: "deleted_1@deleted.modorepair.com",
      created_at: "2026-09-02T01:00:00.000Z",
      acq_source: "naver",
    },
  ],
  orders: [
    {
      user_id: "u1",
      created_at: "2026-09-04T01:00:00.000Z",
      paid_at: "2026-09-04T01:00:00.000Z",
      total_price: 40000,
      payment_status: "PAID",
      acq_source: "naver",
      acq_campaign: "수선_검색",
    },
    {
      user_id: "u1",
      created_at: "2026-09-06T01:00:00.000Z",
      paid_at: "2026-09-06T01:00:00.000Z",
      total_price: 20000,
      payment_status: "PAID",
      acq_source: "google",
      acq_campaign: "브랜드",
    },
    {
      user_id: "u3",
      created_at: "2026-09-05T01:00:00.000Z",
      paid_at: "2026-09-05T01:00:00.000Z",
      total_price: 30000,
      payment_status: "PAID",
      acq_source: "naver",
      acq_campaign: "수선_검색",
    },
  ],
  events: [],
  spends: [
    { source: "naver", campaign: "수선_검색", start_date: "2026-09-01", end_date: "2026-09-07", amount: 70000 },
    { source: "instagram", campaign: "릴스A", start_date: "2026-09-01", end_date: "2026-09-07", amount: 35000 },
  ],
});

assert(data.totals.signups === 2, "기간 가입 2 (탈퇴 제외)");
assert(data.totals.newPayers === 2, "첫 결제가 기간 안인 고객 u1·u3");
assert(data.totals.orders === 3, "기간 결제 3건");
assert(data.totals.spend === 105000, "기간 광고비");

const naver = data.channels.find((row) => row.sourceKey === "naver");
assert(naver?.signups === 1, "네이버 가입 1");
assert(naver?.orders === 2, "네이버 마지막터치 주문 2 (u1 첫주문 + u3)");
assert(naver?.newPayers === 2, "네이버 CAC 분모는 첫터치 신규결제 2");
assert(naver?.cac === 35000, "네이버 CAC 35000");
assert(naver?.signupCpa === 70000, "네이버 가입 CPA");
assert(naver?.orderCpa === 35000, "네이버 주문 CPA");

const insta = data.channels.find((row) => row.sourceKey === "instagram");
assert(insta?.signups === 1 && insta.newPayers === 0, "인스타 가입만");
assert(insta?.verdictKey === "review", "인스타는 가입만 있어 정리 검토");
assert(insta?.signupToPayRate === 0, "인스타 가입→결제 0%");

const google = data.channels.find((row) => row.sourceKey === "google");
assert(google?.orders === 1 && google.newPayers === 0, "구글은 재클릭 주문만");
assert(google?.verdictKey === "need_spend", "구글 광고비 없음");

const naverCampaign = data.campaigns.find((row) => row.sourceKey === "naver" && row.campaign === "수선_검색");
assert(naverCampaign?.cac === 35000, "캠페인 CAC");

const cut = verdictFor({
  sourceKey: "naver",
  source: "네이버",
  campaign: "x",
  signups: 0,
  signupPayers: 0,
  orders: 0,
  revenue: 0,
  newPayers: 0,
  spend: 10000,
  signupCpa: null,
  orderCpa: null,
  cac: null,
  signupToPayRate: null,
  roas: null,
});
assert(cut.verdictKey === "cut", "전환 없이 광고비만 있으면 정리 후보");

const inferred = buildAdPerformance({
  startDate: "2026-09-01",
  endDate: "2026-09-07",
  users: [{ id: "u9", created_at: "2026-09-02T01:00:00.000Z" }],
  orders: [],
  events: [
    {
      created_at: "2026-09-02T00:30:00.000Z",
      user_id: "u9",
      referrer: "https://m.search.naver.com/search",
      device_os: "웹 (Android)",
      app_version: "web",
    },
  ],
  spends: [],
});
assert(inferred.channels.some((row) => row.sourceKey === "naver" && row.signups === 1), "이벤트 referrer로 가입 귀속");

console.log("ad-performance.test.ts ok");
