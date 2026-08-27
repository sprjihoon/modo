/** 운영 모니터 리포트 — KST 하루 스냅샷 집계 */

export type OpsDailyPulse = {
  signups: number;
  paidOrders: number;
  revenue: number;
  aov: number;
  paymentFailed: number;
  promoUsed: number;
  promoDiscount: number;
  sources: { web: number; app: number; ios: number; android: number; other: number };
};

export type OpsDailyPipeline = {
  booked: number;
  inbound: number;
  processing: number;
  hold: number;
  readyToShip: number;
  outForDelivery: number;
  delivered: number;
  missingPickup: number;
  waitlist: number;
  stuckOver3Days: number;
  pickupsToday: number;
  pickupsTomorrow: number;
  cancelOpen: number;
  orderLimit: number | null;
  todayOrderCount: number | null;
};

export type OpsDailyExceptions = {
  cancelQueue: number;
  csEvents: number;
  extraChargePending: number;
  compensationPending: number;
  webhookErrors: number;
  webhookBadSig: number;
  notificationsUnsent: number;
  notificationsRetry3: number;
};

export type OpsDailyCenter = {
  inboundScans: number;
  workComplete: number;
  outboundScans: number;
};

export type OpsDailyMoneyOut = {
  paymentRefund: number;
  repairRefund: number;
  compensation: number;
  orderCancel: number;
};

export type OpsDailyCustomers = {
  signups: number;
  withdrawals: number;
  active30d: number;
  recentLogins: number;
  totalCustomers: number;
};

export type OpsDailyMetrics = {
  pulse: OpsDailyPulse;
  pipeline: OpsDailyPipeline | null;
  exceptions: OpsDailyExceptions;
  center: OpsDailyCenter;
  moneyOut: OpsDailyMoneyOut;
  customers?: OpsDailyCustomers;
};

export type OpsDailyReportRow = {
  report_date: string;
  generated_at: string;
  metrics: OpsDailyMetrics;
  email_sent_at: string | null;
  email_error: string | null;
  generated_by: string | null;
};

export type PaidOrderRow = {
  payment_status: string | null;
  status: string | null;
  total_price: number | null;
  promotion_code_id: string | null;
  promotion_discount_amount: number | null;
  order_source: string | null;
};

const CLOSED = new Set(["CANCELLED", "RETURN_PENDING", "RETURN_SHIPPING", "RETURN_DONE"]);

export function kstToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function addKstDays(dateYmd: string, days: number): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function kstYesterday(): string {
  return addKstDays(kstToday(), -1);
}

/** KST 하루 → UTC ISO 구간 */
export function kstDayRange(dateYmd: string): { startUtc: string; endUtc: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    throw new Error(`invalid date: ${dateYmd}`);
  }
  return {
    startUtc: new Date(`${dateYmd}T00:00:00+09:00`).toISOString(),
    endUtc: new Date(`${dateYmd}T23:59:59.999+09:00`).toISOString(),
  };
}

export function emptyPulse(): OpsDailyPulse {
  return {
    signups: 0,
    paidOrders: 0,
    revenue: 0,
    aov: 0,
    paymentFailed: 0,
    promoUsed: 0,
    promoDiscount: 0,
    sources: { web: 0, app: 0, ios: 0, android: 0, other: 0 },
  };
}

export function emptyCustomers(): OpsDailyCustomers {
  return {
    signups: 0,
    withdrawals: 0,
    active30d: 0,
    recentLogins: 0,
    totalCustomers: 0,
  };
}

export function customersOf(metrics: OpsDailyMetrics): OpsDailyCustomers {
  return {
    ...emptyCustomers(),
    ...(metrics.customers ?? {}),
    signups: metrics.customers?.signups ?? metrics.pulse.signups,
  };
}

export function emptyExceptions(): OpsDailyExceptions {
  return {
    cancelQueue: 0,
    csEvents: 0,
    extraChargePending: 0,
    compensationPending: 0,
    webhookErrors: 0,
    webhookBadSig: 0,
    notificationsUnsent: 0,
    notificationsRetry3: 0,
  };
}

export function assemblePulse(params: {
  signups: number;
  orders: PaidOrderRow[];
  paymentFailed: number;
}): OpsDailyPulse {
  const paid = params.orders.filter(
    (o) => o.payment_status === "PAID" && !CLOSED.has(o.status ?? "")
  );
  const revenue = paid.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const sources = { web: 0, app: 0, ios: 0, android: 0, other: 0 };
  for (const o of paid) {
    const src = (o.order_source || "").toLowerCase();
    if (src === "web") sources.web += 1;
    else if (src === "ios") sources.ios += 1;
    else if (src === "android") sources.android += 1;
    else if (src === "app") sources.app += 1;
    else sources.other += 1;
  }
  return {
    signups: params.signups,
    paidOrders: paid.length,
    revenue,
    aov: paid.length > 0 ? Math.round(revenue / paid.length) : 0,
    paymentFailed: params.paymentFailed,
    promoUsed: paid.filter((o) => o.promotion_code_id).length,
    promoDiscount: paid.reduce((sum, o) => sum + (o.promotion_discount_amount || 0), 0),
    sources,
  };
}

export function exceptionAttention(ex: OpsDailyExceptions): number {
  return (
    ex.cancelQueue +
    ex.csEvents +
    ex.extraChargePending +
    ex.compensationPending +
    ex.webhookErrors +
    ex.webhookBadSig +
    ex.notificationsUnsent +
    ex.notificationsRetry3
  );
}

export function shouldStorePipeline(reportDate: string, today = kstToday()): boolean {
  return reportDate === today || reportDate === addKstDays(today, -1);
}

export type TrendGrain = "day" | "week" | "month";

export type TrendPoint = {
  date: string;
  label: string;
  signups: number;
  withdrawals: number;
  recentLogins: number;
  active30d: number;
  totalCustomers: number;
  paidOrders: number;
  revenue: number;
  paymentFailed: number;
  csEvents: number;
  attention: number;
};

export function weekStartMonday(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  return addKstDays(dateYmd, -back);
}

export function monthStart(dateYmd: string): string {
  return `${dateYmd.slice(0, 7)}-01`;
}

export function lastDayOfMonth(dateYmd: string): string {
  const [y, m] = dateYmd.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function formatMd(dateYmd: string): string {
  const [, m, d] = dateYmd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function toTrendPoints(rows: OpsDailyReportRow[]): TrendPoint[] {
  return [...rows]
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map((row) => {
      const customers = customersOf(row.metrics);
      return {
        date: row.report_date,
        label: row.report_date,
        signups: customers.signups,
        withdrawals: customers.withdrawals,
        recentLogins: customers.recentLogins,
        active30d: customers.active30d,
        totalCustomers: customers.totalCustomers,
        paidOrders: row.metrics.pulse.paidOrders,
        revenue: row.metrics.pulse.revenue,
        paymentFailed: row.metrics.pulse.paymentFailed,
        csEvents: row.metrics.exceptions.csEvents,
        attention: exceptionAttention(row.metrics.exceptions),
      };
    });
}

export function aggregateTrend(points: TrendPoint[], grain: TrendGrain): TrendPoint[] {
  if (grain === "day") return points;
  const groups = new Map<string, TrendPoint>();
  for (const point of points) {
    const key = grain === "week" ? weekStartMonday(point.date) : monthStart(point.date);
    const current = groups.get(key) ?? {
      date: key,
      label: key,
      signups: 0,
      withdrawals: 0,
      recentLogins: 0,
      active30d: 0,
      totalCustomers: 0,
      paidOrders: 0,
      revenue: 0,
      paymentFailed: 0,
      csEvents: 0,
      attention: 0,
    };
    current.signups += point.signups;
    current.withdrawals += point.withdrawals;
    current.recentLogins += point.recentLogins;
    current.active30d = point.active30d;
    current.totalCustomers = point.totalCustomers;
    current.paidOrders += point.paidOrders;
    current.revenue += point.revenue;
    current.paymentFailed += point.paymentFailed;
    current.csEvents += point.csEvents;
    current.attention += point.attention;
    groups.set(key, current);
  }
  return [...groups.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      ...point,
      label:
        grain === "week"
          ? `${formatMd(point.date)}~${formatMd(addKstDays(point.date, 6))}`
          : point.date.slice(0, 7),
    }));
}

export function eachDateInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addKstDays(cursor, 1);
    if (dates.length > 366) break;
  }
  return dates;
}

export function parseReportDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

type AdminClient = ReturnType<typeof import("./supabase").getSupabaseAdmin>;

async function countRows(
  admin: AdminClient,
  table: string,
  apply: (q: any) => any
): Promise<number> {
  let q = admin.from(table as never).select("*", { count: "exact", head: true });
  q = apply(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

async function rpcCount(
  admin: AdminClient,
  name: string,
  args: Record<string, string>
): Promise<number> {
  const { data, error } = await (admin as any).rpc(name, args);
  if (error || typeof data !== "number") return 0;
  return data;
}

export async function buildOpsDailyMetrics(
  admin: AdminClient,
  reportDate: string
): Promise<OpsDailyMetrics> {
  const { startUtc, endUtc } = kstDayRange(reportDate);
  const includePipeline = shouldStorePipeline(reportDate);

  const ordersQuery = admin
    .from("orders")
    .select(
      "payment_status, status, total_price, promotion_code_id, promotion_discount_amount, order_source"
    )
    .gte("created_at", startUtc)
    .lte("created_at", endUtc);

  const activeStartUtc = kstDayRange(addKstDays(reportDate, -29)).startUtc;

  const [
    ordersRes,
    signups,
    withdrawals,
    totalCustomers,
    active30d,
    recentLogins,
    paymentFailed,
    csEvents,
    compensationPending,
    webhookErrors,
    webhookBadSig,
    cancelByAt,
    cancelByReturn,
    inboundScans,
    workComplete,
    outboundScans,
    moneyCs,
  ] = await Promise.all([
    ordersQuery,
    countRows(admin, "users", (q) =>
      q
        .eq("role", "CUSTOMER")
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .not("email", "like", "deleted_%")
    ),
    countRows(admin, "users", (q) =>
      q
        .eq("role", "CUSTOMER")
        .like("email", "deleted_%@deleted.modorepair.com")
        .gte("updated_at", startUtc)
        .lte("updated_at", endUtc)
    ),
    countRows(admin, "users", (q) =>
      q.eq("role", "CUSTOMER").not("email", "like", "deleted_%").lte("created_at", endUtc)
    ),
    rpcCount(admin, "count_active_customers", { p_start: activeStartUtc, p_end: endUtc }),
    rpcCount(admin, "count_customer_signins", { p_start: startUtc, p_end: endUtc }),
    countRows(admin, "orders", (q) =>
      q.eq("payment_status", "FAILED").gte("created_at", startUtc).lte("created_at", endUtc)
    ),
    countRows(admin, "order_cs_events", (q) =>
      q.gte("created_at", startUtc).lte("created_at", endUtc)
    ),
    countRows(admin, "order_cs_events", (q) =>
      q.eq("payout_status", "PENDING").eq("action", "COMPENSATION")
    ),
    countRows(admin, "webhook_logs", (q) =>
      q.not("process_error", "is", null).gte("received_at", startUtc).lte("received_at", endUtc)
    ),
    countRows(admin, "webhook_logs", (q) =>
      q.eq("signature_ok", false).gte("received_at", startUtc).lte("received_at", endUtc)
    ),
    countRows(admin, "orders", (q) =>
      q.not("canceled_at", "is", null).gte("canceled_at", startUtc).lte("canceled_at", endUtc)
    ),
    countRows(admin, "orders", (q) =>
      q
        .is("canceled_at", null)
        .or(
          "status.in.(RETURN_PENDING,RETURN_SHIPPING,RETURN_DONE),extra_charge_status.eq.RETURN_REQUESTED"
        )
        .gte("updated_at", startUtc)
        .lte("updated_at", endUtc)
    ),
    countRows(admin, "action_logs", (q) =>
      q.eq("action_type", "SCAN_INBOUND").gte("timestamp", startUtc).lte("timestamp", endUtc)
    ),
    countRows(admin, "action_logs", (q) =>
      q.eq("action_type", "WORK_COMPLETE").gte("timestamp", startUtc).lte("timestamp", endUtc)
    ),
    countRows(admin, "action_logs", (q) =>
      q.eq("action_type", "SCAN_OUTBOUND").gte("timestamp", startUtc).lte("timestamp", endUtc)
    ),
    admin
      .from("order_cs_events")
      .select("action, amount")
      .gte("created_at", startUtc)
      .lte("created_at", endUtc)
      .in("action", ["PAYMENT_REFUND", "REPAIR_REFUND", "COMPENSATION", "ORDER_CANCEL"]),
  ]);

  const cancelQueue = cancelByAt + cancelByReturn;

  const pulse = assemblePulse({
    signups,
    orders: (ordersRes.data ?? []) as PaidOrderRow[],
    paymentFailed,
  });

  const moneyOut: OpsDailyMoneyOut = {
    paymentRefund: 0,
    repairRefund: 0,
    compensation: 0,
    orderCancel: 0,
  };
  for (const row of moneyCs.data ?? []) {
    const amount = Number(row.amount ?? 0);
    if (row.action === "PAYMENT_REFUND") moneyOut.paymentRefund += amount;
    if (row.action === "REPAIR_REFUND") moneyOut.repairRefund += amount;
    if (row.action === "COMPENSATION") moneyOut.compensation += amount;
    if (row.action === "ORDER_CANCEL") moneyOut.orderCancel += amount;
  }

  const extraChargePending = includePipeline
    ? await countRows(admin, "orders", (q) =>
        q.in("extra_charge_status", ["PENDING_MANAGER", "PENDING_CUSTOMER"])
      )
    : 0;

  const [notificationsUnsent, notificationsRetry3] = includePipeline
    ? await Promise.all([
        countRows(admin, "notification_events", (q) => q.eq("notification_sent", false)),
        countRows(admin, "notification_events", (q) =>
          q.eq("notification_sent", false).gte("retry_count", 3)
        ),
      ])
    : [0, 0];

  let pipeline: OpsDailyPipeline | null = null;
  if (includePipeline) {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const missingSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = addKstDays(kstToday(), 1);

    const [
      booked,
      inbound,
      processing,
      hold,
      readyToShip,
      outForDelivery,
      delivered,
      missingPickup,
      waitlist,
      stuckOver3Days,
      pickupsToday,
      pickupsTomorrow,
      cancelOpen,
      limitRow,
    ] = await Promise.all([
      countRows(admin, "orders", (q) => q.eq("status", "BOOKED")),
      countRows(admin, "orders", (q) => q.eq("status", "INBOUND")),
      countRows(admin, "orders", (q) => q.eq("status", "PROCESSING")),
      countRows(admin, "orders", (q) => q.eq("status", "HOLD")),
      countRows(admin, "orders", (q) => q.eq("status", "READY_TO_SHIP")),
      countRows(admin, "orders", (q) => q.eq("status", "OUT_FOR_DELIVERY")),
      countRows(admin, "orders", (q) => q.eq("status", "DELIVERED")),
      countRows(admin, "orders", (q) =>
        q
          .eq("status", "PAID")
          .eq("payment_status", "PAID")
          .is("tracking_no", null)
          .is("canceled_at", null)
          .gte("created_at", missingSince)
      ),
      countRows(admin, "order_waitlist", (q) => q.eq("status", "waiting")),
      countRows(admin, "orders", (q) =>
        q
          .in("status", ["PENDING", "PAID", "BOOKED"])
          .is("canceled_at", null)
          .lte("created_at", threeDaysAgo)
      ),
      countRows(admin, "shipments", (q) => q.eq("pickup_scheduled_date", kstToday())),
      countRows(admin, "shipments", (q) => q.eq("pickup_scheduled_date", tomorrow)),
      countRows(admin, "cancellation_queue", (q) => q.neq("queue_kind", "RETURN_DONE")),
      admin.from("company_info").select("daily_order_limit").limit(1).maybeSingle(),
    ]);

    let todayOrderCount: number | null = null;
    const { data: todayCount } = await admin.rpc("get_today_order_count");
    if (typeof todayCount === "number") todayOrderCount = todayCount;

    pipeline = {
      booked,
      inbound,
      processing,
      hold,
      readyToShip,
      outForDelivery,
      delivered,
      missingPickup,
      waitlist,
      stuckOver3Days,
      pickupsToday,
      pickupsTomorrow,
      cancelOpen,
      orderLimit: limitRow.data?.daily_order_limit ?? null,
      todayOrderCount,
    };
  }

  return {
    pulse,
    pipeline,
    exceptions: {
      cancelQueue,
      csEvents,
      extraChargePending,
      compensationPending,
      webhookErrors,
      webhookBadSig,
      notificationsUnsent,
      notificationsRetry3,
    },
    center: { inboundScans, workComplete, outboundScans },
    moneyOut,
    customers: {
      signups,
      withdrawals,
      active30d,
      recentLogins,
      totalCustomers,
    },
  };
}

export function reportEmailRecipients(): string[] {
  const raw = process.env.OPS_REPORT_EMAIL || "";
  return raw
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
}

function won(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function buildOpsReportEmailHtml(reportDate: string, metrics: OpsDailyMetrics): string {
  const p = metrics.pulse;
  const e = metrics.exceptions;
  const c = customersOf(metrics);
  const pipe = metrics.pipeline;
  const attn = exceptionAttention(e);
  const pipelineRows = pipe
    ? `
      <tr><td style="padding:6px 0;color:#4b5563;">수거 대기</td><td style="text-align:right;font-weight:700;">${pipe.booked}</td></tr>
      <tr><td style="padding:6px 0;color:#4b5563;">입고 / 작업 / 홀드</td><td style="text-align:right;font-weight:700;">${pipe.inbound} / ${pipe.processing} / ${pipe.hold}</td></tr>
      <tr><td style="padding:6px 0;color:#4b5563;">출고 대기 / 배송중</td><td style="text-align:right;font-weight:700;">${pipe.readyToShip} / ${pipe.outForDelivery}</td></tr>
      <tr><td style="padding:6px 0;color:#4b5563;">미수거 · 3일 정체 · 대기열</td><td style="text-align:right;font-weight:700;">${pipe.missingPickup} · ${pipe.stuckOver3Days} · ${pipe.waitlist}</td></tr>
      <tr><td style="padding:6px 0;color:#4b5563;">남은 취소·반송</td><td style="text-align:right;font-weight:700;">${pipe.cancelOpen}</td></tr>`
    : `<tr><td colspan="2" style="padding:6px 0;color:#9ca3af;">당시 파이프라인 스냅샷 없음 (과거 백필)</td></tr>`;

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8" /><title>운영 리포트 ${reportDate}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#00C896;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:800;">모두의수선 운영 리포트</td></tr>
        <tr><td style="padding:24px 28px 8px;color:#111827;font-size:20px;font-weight:800;">${reportDate}</td></tr>
        <tr><td style="padding:8px 28px 0;color:#4b5563;font-size:14px;">가입 ${c.signups} · 탈퇴 ${c.withdrawals} · 결제 ${p.paidOrders} · 매출 ${won(p.revenue)} · 살펴볼 일 ${attn}</td></tr>
        <tr><td style="padding:6px 28px 0;color:#6b7280;font-size:13px;">활성(30일) ${c.active30d} · 그날 접속 ${c.recentLogins} · 전체 고객 ${c.totalCustomers}</td></tr>
        <tr><td style="padding:20px 28px 8px;font-size:13px;font-weight:700;color:#111827;">맥박</td></tr>
        <tr><td style="padding:0 28px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
            <tr><td style="padding:6px 0;color:#4b5563;">결제 실패</td><td style="text-align:right;font-weight:700;">${p.paymentFailed}</td></tr>
            <tr><td style="padding:6px 0;color:#4b5563;">쿠폰</td><td style="text-align:right;font-weight:700;">${p.promoUsed}건 / ${won(p.promoDiscount)}</td></tr>
            <tr><td style="padding:6px 0;color:#4b5563;">채널</td><td style="text-align:right;font-weight:700;">web ${p.sources.web} · app ${p.sources.app + p.sources.ios + p.sources.android}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px 8px;font-size:13px;font-weight:700;color:#111827;">파이프라인</td></tr>
        <tr><td style="padding:0 28px;"><table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">${pipelineRows}</table></td></tr>
        <tr><td style="padding:20px 28px 8px;font-size:13px;font-weight:700;color:#111827;">예외</td></tr>
        <tr><td style="padding:0 28px 28px;"><table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
          <tr><td style="padding:6px 0;color:#4b5563;">그날 취소·반송</td><td style="text-align:right;font-weight:700;">${e.cancelQueue}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563;">CS · 추가금 대기 · 보상 미지급</td><td style="text-align:right;font-weight:700;">${e.csEvents} · ${e.extraChargePending} · ${e.compensationPending}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563;">웹훅 오류 / 서명</td><td style="text-align:right;font-weight:700;">${e.webhookErrors} / ${e.webhookBadSig}</td></tr>
          <tr><td style="padding:6px 0;color:#4b5563;">알림 미발송 / 재시도 3+</td><td style="text-align:right;font-weight:700;">${e.notificationsUnsent} / ${e.notificationsRetry3}</td></tr>
        </table></td></tr>
        <tr><td style="padding:0 28px 32px;color:#9ca3af;font-size:12px;">자세히 보기: <a href="https://admin.modo.mom/dashboard/reports?date=${reportDate}" style="color:#00C896;text-decoration:none;">어드민 운영 리포트</a></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildOpsReportEmailText(reportDate: string, metrics: OpsDailyMetrics): string {
  const p = metrics.pulse;
  const e = metrics.exceptions;
  const c = customersOf(metrics);
  return [
    `모두의수선 운영 리포트 ${reportDate}`,
    `가입 ${c.signups} / 탈퇴 ${c.withdrawals} / 결제 ${p.paidOrders} / 매출 ${p.revenue}원`,
    `활성(30일) ${c.active30d} / 그날 접속 ${c.recentLogins} / 전체 ${c.totalCustomers}`,
    `결제실패 ${p.paymentFailed} / CS ${e.csEvents} / 살펴볼 일 ${exceptionAttention(e)}`,
    `https://admin.modo.mom/dashboard/reports?date=${reportDate}`,
  ].join("\n");
}

const DEFAULT_RESEND_FROM = "모두의수선 <noreply@modo.mom>";

export function resolveResendFrom(raw?: string | null): string {
  const value = raw?.trim() ?? "";
  if (!value) return DEFAULT_RESEND_FROM;
  const name = (value.split("<")[0] ?? "").trim();
  if (/^=\?UTF-8\?/i.test(name)) return value;
  if (/\?/.test(name)) return DEFAULT_RESEND_FROM;
  return value;
}

export async function sendOpsReportEmail(params: {
  to: string[];
  reportDate: string;
  metrics: OpsDailyMetrics;
}): Promise<{ sent: boolean; error?: string; id?: string }> {
  const html = buildOpsReportEmailHtml(params.reportDate, params.metrics);
  const text = buildOpsReportEmailText(params.reportDate, params.metrics);

  const viaEdge = await sendOpsReportEmailViaEdge({
    to: params.to,
    reportDate: params.reportDate,
    html,
    text,
  });
  if (viaEdge.sent || !process.env.RESEND_API_KEY) return viaEdge;

  if (params.to.length === 0) return { sent: false, error: "수신 주소 없음" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resolveResendFrom(process.env.RESEND_FROM_EMAIL),
      to: params.to,
      subject: `[모두의수선] 운영 리포트 ${params.reportDate}`,
      html,
      text,
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    return {
      sent: false,
      error: typeof result?.message === "string" ? result.message : JSON.stringify(result),
    };
  }
  return { sent: true, id: result.id };
}

async function sendOpsReportEmailViaEdge(params: {
  to: string[];
  reportDate: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; error?: string; id?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { sent: false, error: "Supabase 설정 없음" };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-ops-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      type: "daily-report",
      reportDate: params.reportDate,
      html: params.html,
      text: params.text,
      to: params.to,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.sent === false) {
    return {
      sent: false,
      error:
        typeof result?.error === "string"
          ? result.error
          : `Edge 메일 발송 실패 (${response.status})`,
    };
  }
  return { sent: true, id: typeof result.id === "string" ? result.id : undefined };
}
