import {
  addKstDays,
  aggregateTrend,
  assemblePulse,
  buildOpsReportEmailText,
  eachDateInclusive,
  exceptionAttention,
  kstDayRange,
  lastDayOfMonth,
  parseReportDate,
  shouldStorePipeline,
  toTrendPoints,
  weekStartMonday,
  type OpsDailyMetrics,
  type OpsDailyReportRow,
} from "./ops-daily-report";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const range = kstDayRange("2026-08-25");
assert(range.startUtc === "2026-08-24T15:00:00.000Z", "KST 0시는 UTC 전날 15시");
assert(range.endUtc.startsWith("2026-08-25T14:59:59"), "KST 하루 끝은 UTC 14:59");

assert(addKstDays("2026-08-01", -1) === "2026-07-31", "월 넘김");
assert(parseReportDate("2026-08-26") === "2026-08-26", "정상 날짜");
assert(parseReportDate("yesterday") === null, "잘못된 날짜");
assert(parseReportDate("") === null, "빈 날짜");

assert(shouldStorePipeline("2026-08-26", "2026-08-26") === true, "오늘은 파이프라인 저장");
assert(shouldStorePipeline("2026-08-25", "2026-08-26") === true, "어제는 파이프라인 저장");
assert(shouldStorePipeline("2026-08-01", "2026-08-26") === false, "옛날은 파이프라인 생략");

const pulse = assemblePulse({
  signups: 3,
  paymentFailed: 1,
  orders: [
    {
      payment_status: "PAID",
      status: "BOOKED",
      total_price: 20000,
      promotion_code_id: "p1",
      promotion_discount_amount: 2000,
      order_source: "web",
    },
    {
      payment_status: "PAID",
      status: "CANCELLED",
      total_price: 90000,
      promotion_code_id: null,
      promotion_discount_amount: 0,
      order_source: "app",
    },
    {
      payment_status: "PAID",
      status: "INBOUND",
      total_price: 10000,
      promotion_code_id: null,
      promotion_discount_amount: 0,
      order_source: "ios",
    },
  ],
});
assert(pulse.signups === 3, "가입");
assert(pulse.paidOrders === 2, "취소 제외 결제 2건");
assert(pulse.revenue === 30000, "매출 3만");
assert(pulse.aov === 15000, "객단가");
assert(pulse.promoUsed === 1 && pulse.promoDiscount === 2000, "쿠폰");
assert(pulse.sources.web === 1 && pulse.sources.ios === 1, "채널");
assert(pulse.paymentFailed === 1, "결제 실패");

const metrics: OpsDailyMetrics = {
  pulse,
  pipeline: null,
  exceptions: {
    cancelQueue: 1,
    csEvents: 2,
    extraChargePending: 0,
    compensationPending: 1,
    webhookErrors: 0,
    webhookBadSig: 0,
    notificationsUnsent: 3,
    notificationsRetry3: 1,
  },
  center: { inboundScans: 0, workComplete: 0, outboundScans: 0 },
  moneyOut: { paymentRefund: 0, repairRefund: 0, compensation: 0, orderCancel: 0 },
};
assert(exceptionAttention(metrics.exceptions) === 8, "살펴볼 일 합");

const rows: OpsDailyReportRow[] = [
  {
    report_date: "2026-08-26",
    generated_at: "2026-08-26T00:00:00.000Z",
    metrics,
    email_sent_at: null,
    email_error: null,
    generated_by: "test",
  },
  {
    report_date: "2026-08-25",
    generated_at: "2026-08-25T00:00:00.000Z",
    metrics: {
      ...metrics,
      pulse: { ...pulse, paidOrders: 1, revenue: 10000, signups: 0 },
    },
    email_sent_at: null,
    email_error: null,
    generated_by: "test",
  },
];
const trend = toTrendPoints(rows);
assert(trend[0].date === "2026-08-25" && trend[1].date === "2026-08-26", "추이 오름차순");
assert(trend[0].paidOrders === 1 && trend[1].paidOrders === 2, "추이 결제 건수");

assert(weekStartMonday("2026-08-26") === "2026-08-24", "수요일은 월요일 시작");
assert(weekStartMonday("2026-08-23") === "2026-08-17", "일요일은 전주 월요일");
assert(eachDateInclusive("2026-08-25", "2026-08-26").join(",") === "2026-08-25,2026-08-26", "기간 나열");

const week = aggregateTrend(trend, "week");
assert(week.length === 1, "같은 주면 한 칸");
assert(week[0].paidOrders === 3, "주 합계 결제");
assert(week[0].label.includes("~"), "주 라벨");
assert(aggregateTrend(trend, "month")[0].label === "2026-08", "월 라벨");
assert(lastDayOfMonth("2026-08-01") === "2026-08-31", "월말");

const text = buildOpsReportEmailText("2026-08-25", metrics);
assert(text.includes("2026-08-25"), "메일 날짜");
assert(text.includes("결제 2"), "메일 결제 건");

console.log("ops-daily-report tests passed");
