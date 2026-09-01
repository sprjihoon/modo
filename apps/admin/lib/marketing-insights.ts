export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type Bucket = {
  key: number;
  label: string;
  count: number;
  amount: number;
  users: number;
};

export type HeatCell = {
  weekday: number;
  hour: number;
  count: number;
  amount: number;
};

export type NamedCount = {
  name: string;
  count: number;
  amount: number;
};

export type MarketingInsight = {
  title: string;
  body: string;
};

export type MarketingInsightsData = {
  range: { startDate: string | null; endDate: string | null };
  totals: {
    paidOrders: number;
    paidAmount: number;
    aov: number;
    signups: number;
    visitors: number;
    events: number;
  };
  paymentsByWeekday: Bucket[];
  paymentsByHour: Bucket[];
  visitsByWeekday: Bucket[];
  signupsByWeekday: Bucket[];
  heatmap: HeatCell[];
  sources: NamedCount[];
  clothing: NamedCount[];
  repairs: NamedCount[];
  daily: DailyStat[];
  accessPaths: AccessPathStat[];
  compare: CampaignCompare | null;
  insights: MarketingInsight[];
};

export function kstParts(iso: string): { weekday: number; hour: number; ymd: string } {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return {
    weekday: kst.getUTCDay(),
    hour: kst.getUTCHours(),
    ymd: kst.toISOString().slice(0, 10),
  };
}

export function addDaysYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function eachYmd(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDaysYmd(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export type DailyStat = {
  date: string;
  signups: number;
  payers: number;
  payments: number;
  amount: number;
  visitors: number;
};

export type PeriodTotals = {
  startDate: string;
  endDate: string;
  signups: number;
  payers: number;
  payments: number;
  amount: number;
  visitors: number;
};

export type CampaignCompare = {
  current: PeriodTotals;
  previous: PeriodTotals;
  delta: Omit<PeriodTotals, "startDate" | "endDate">;
  pct: Omit<PeriodTotals, "startDate" | "endDate">;
};

function sumDaily(days: DailyStat[]): Omit<PeriodTotals, "startDate" | "endDate"> {
  return days.reduce(
    (sum, day) => ({
      signups: sum.signups + day.signups,
      payers: sum.payers + day.payers,
      payments: sum.payments + day.payments,
      amount: sum.amount + day.amount,
      visitors: sum.visitors + day.visitors,
    }),
    { signups: 0, payers: 0, payments: 0, amount: 0, visitors: 0 }
  );
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export function previousPeriod(start: string, end: string): { start: string; end: string } | null {
  const days = eachYmd(start, end).length;
  if (!days) return null;
  return {
    start: addDaysYmd(start, -days),
    end: addDaysYmd(start, -1),
  };
}

export function compareTotals(current: PeriodTotals, previous: PeriodTotals): CampaignCompare {
  return {
    current,
    previous,
    delta: {
      signups: current.signups - previous.signups,
      payers: current.payers - previous.payers,
      payments: current.payments - previous.payments,
      amount: current.amount - previous.amount,
      visitors: current.visitors - previous.visitors,
    },
    pct: {
      signups: pctChange(current.signups, previous.signups),
      payers: pctChange(current.payers, previous.payers),
      payments: pctChange(current.payments, previous.payments),
      amount: pctChange(current.amount, previous.amount),
      visitors: pctChange(current.visitors, previous.visitors),
    },
  };
}

export function inKstRange(iso: string | null | undefined, start: string, end: string): boolean {
  if (!iso || !start || !end) return false;
  const ymd = kstParts(iso).ymd;
  return ymd >= start && ymd <= end;
}

export function compareDailyPeriods(daily: DailyStat[], start: string, end: string): CampaignCompare | null {
  const previous = previousPeriod(start, end);
  if (!previous) return null;
  const currentDays = daily.filter((day) => day.date >= start && day.date <= end);
  const previousDays = daily.filter((day) => day.date >= previous.start && day.date <= previous.end);
  const current = { startDate: start, endDate: end, ...sumDaily(currentDays) };
  const prev = { startDate: previous.start, endDate: previous.end, ...sumDaily(previousDays) };
  return {
    current,
    previous: prev,
    delta: {
      signups: current.signups - prev.signups,
      payers: current.payers - prev.payers,
      payments: current.payments - prev.payments,
      amount: current.amount - prev.amount,
      visitors: current.visitors - prev.visitors,
    },
    pct: {
      signups: pctChange(current.signups, prev.signups),
      payers: pctChange(current.payers, prev.payers),
      payments: pctChange(current.payments, prev.payments),
      amount: pctChange(current.amount, prev.amount),
      visitors: pctChange(current.visitors, prev.visitors),
    },
  };
}

export type AccessPathStat = {
  name: string;
  sessions: number;
  users: number;
  events: number;
};

const OWN_HOSTS = [
  "modo.io.kr",
  "www.modo.io.kr",
  "modo.mom",
  "www.modo.mom",
  "modorepair.com",
  "www.modorepair.com",
  "admin.modo.mom",
  "localhost",
];

const ACCESS_RULES: Array<{ name: string; match: RegExp }> = [
  { name: "네이버", match: /naver\.com|naver\.me/i },
  { name: "인스타그램", match: /instagram\.com|l\.instagram|ig\.me/i },
  { name: "유튜브", match: /youtube\.com|youtu\.be/i },
  { name: "구글", match: /google\.|goo\.gl|g\.page/i },
  { name: "페이스북", match: /facebook\.com|fb\.com|fb\.me|l\.facebook/i },
  { name: "카카오", match: /kakao\.com|kakaocdn\.net|daum\.net/i },
  { name: "틱톡", match: /tiktok\.com|vm\.tiktok/i },
  { name: "스레드", match: /threads\.net/i },
  { name: "트위터", match: /twitter\.com|x\.com|t\.co/i },
  { name: "블로그", match: /tistory\.com|brunch\.co/i },
];

function textFromUnknown(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function utmFromRecord(record?: Record<string, unknown> | null): string {
  if (!record) return "";
  return (
    textFromUnknown(record.utm_source) ||
    textFromUnknown(record.utmSource) ||
    textFromUnknown(record.source) ||
    ""
  );
}

function utmFromUrl(url?: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url, "https://modo.io.kr");
    return parsed.searchParams.get("utm_source") || parsed.searchParams.get("source") || "";
  } catch {
    return "";
  }
}

function hostFromUrl(url?: string | null): string {
  if (!url?.trim()) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    try {
      return new URL(`https://${url}`).hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}

function mapKnownSource(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (/naver|네이버/.test(value)) return "네이버";
  if (/insta|ig\b|인스타/.test(value)) return "인스타그램";
  if (/google|구글/.test(value)) return "구글";
  if (/facebook|fb\b|페이스북|메타/.test(value)) return "페이스북";
  if (/kakao|daum|카카오|다음/.test(value)) return "카카오";
  if (/youtube|yt\b|유튜브/.test(value)) return "유튜브";
  if (/tiktok|틱톡/.test(value)) return "틱톡";
  if (/threads|스레드/.test(value)) return "스레드";
  if (/twitter|x\.com|트위터/.test(value)) return "트위터";
  if (/app|ios|android|앱/.test(value)) return /ios/.test(value) ? "앱 · iOS" : /android/.test(value) ? "앱 · Android" : "앱";
  return raw.trim();
}

function mapHost(host: string): string | null {
  if (!host || OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`))) return null;
  const hit = ACCESS_RULES.find((rule) => rule.match.test(host));
  return hit?.name ?? `기타 · ${host}`;
}

export function isAppEvent(input: { device_os?: string | null; app_version?: string | null }): boolean {
  const os = (input.device_os || "").trim();
  const version = (input.app_version || "").trim();
  if (/^웹|\bweb\b/i.test(os) || /^web$/i.test(version)) return false;
  return /^ios|^android/i.test(os) || Boolean(version && version !== "web");
}

export function classifyAccessPath(input: {
  referrer?: string | null;
  page_url?: string | null;
  metadata?: Record<string, unknown> | null;
  device_os?: string | null;
  app_version?: string | null;
}): string {
  const fromUtm =
    mapKnownSource(utmFromRecord(input.metadata)) ||
    mapKnownSource(utmFromUrl(input.page_url));
  if (fromUtm) return fromUtm;

  const fromReferrer = mapHost(hostFromUrl(input.referrer));
  if (fromReferrer) return fromReferrer;

  if (isAppEvent(input)) {
    const os = input.device_os || "";
    if (/^ios/i.test(os)) return "앱 · iOS";
    if (/^android/i.test(os)) return "앱 · Android";
    return "앱";
  }

  if (input.referrer?.trim()) return mapHost(hostFromUrl(input.referrer)) || "기타 웹";
  if (input.page_url || /web/i.test(input.device_os || "") || input.app_version === "web") {
    return "직접 접속";
  }
  return "미기록";
}

export function isPaidOrder(order: {
  payment_status?: string | null;
  paid_at?: string | null;
  status?: string | null;
}): boolean {
  const payment = (order.payment_status || "").toUpperCase();
  if (payment === "FAILED" || payment === "CANCELED" || payment === "REFUNDED" || payment === "PENDING") {
    return false;
  }
  if (payment === "PAID" || payment === "PARTIAL_CANCELED" || payment === "COMPLETED" || payment === "DONE") {
    return true;
  }
  return Boolean(order.paid_at);
}

function emptyWeekdays(): Bucket[] {
  return WEEKDAY_LABELS.map((label, key) => ({ key, label, count: 0, amount: 0, users: 0 }));
}

function emptyHours(): Bucket[] {
  return Array.from({ length: 24 }, (_, key) => ({
    key,
    label: `${key}시`,
    count: 0,
    amount: 0,
    users: 0,
  }));
}

function peak(buckets: Bucket[]): Bucket | null {
  return buckets.reduce<Bucket | null>((best, item) => {
    if (!best || item.count > best.count || (item.count === best.count && item.amount > best.amount)) {
      return item;
    }
    return best;
  }, null);
}

function topNamed(items: NamedCount[], limit = 5): NamedCount[] {
  return [...items].sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, limit);
}

export function buildMarketingInsights(input: {
  startDate: string | null;
  endDate: string | null;
  orders: Array<{
    paid_at?: string | null;
    created_at: string;
    total_price?: number | null;
    payment_status?: string | null;
    status?: string | null;
    clothing_type?: string | null;
    repair_type?: string | null;
    order_source?: string | null;
    user_id?: string | null;
  }>;
  users: Array<{ created_at: string }>;
  events: Array<{
    created_at: string;
    user_id?: string | null;
    event_type?: string | null;
    referrer?: string | null;
    page_url?: string | null;
    metadata?: Record<string, unknown> | null;
    device_os?: string | null;
    app_version?: string | null;
    session_id?: string | null;
  }>;
}): MarketingInsightsData {
  const paid = input.orders.filter(isPaidOrder);
  const paymentsByWeekday = emptyWeekdays();
  const paymentsByHour = emptyHours();
  const visitsByWeekday = emptyWeekdays();
  const signupsByWeekday = emptyWeekdays();
  const weekdayUsers = Array.from({ length: 7 }, () => new Set<string>());
  const hourUsers = Array.from({ length: 24 }, () => new Set<string>());
  const visitUsers = Array.from({ length: 7 }, () => new Set<string>());
  const heatmapMap = new Map<string, HeatCell>();
  const sourceMap = new Map<string, NamedCount>();
  const clothingMap = new Map<string, NamedCount>();
  const repairMap = new Map<string, NamedCount>();

  let paidAmount = 0;
  const visitorIds = new Set<string>();
  const dailyMap = new Map<string, DailyStat & { payerIds: Set<string>; visitorIds: Set<string> }>();

  const ensureDay = (ymd: string) => {
    const current = dailyMap.get(ymd);
    if (current) return current;
    const created: DailyStat & { payerIds: Set<string>; visitorIds: Set<string> } = {
      date: ymd,
      signups: 0,
      payers: 0,
      payments: 0,
      amount: 0,
      visitors: 0,
      payerIds: new Set<string>(),
      visitorIds: new Set<string>(),
    };
    dailyMap.set(ymd, created);
    return created;
  };

  for (const order of paid) {
    const when = order.paid_at || order.created_at;
    const { weekday, hour, ymd } = kstParts(when);
    const day = ensureDay(ymd);
    day.payments += 1;
    day.amount += Number(order.total_price) || 0;
    if (order.user_id) day.payerIds.add(order.user_id);
    const amount = Number(order.total_price) || 0;
    paidAmount += amount;
    paymentsByWeekday[weekday].count += 1;
    paymentsByWeekday[weekday].amount += amount;
    paymentsByHour[hour].count += 1;
    paymentsByHour[hour].amount += amount;
    if (order.user_id) {
      weekdayUsers[weekday].add(order.user_id);
      hourUsers[hour].add(order.user_id);
    }
    const heatKey = `${weekday}-${hour}`;
    const cell = heatmapMap.get(heatKey) ?? { weekday, hour, count: 0, amount: 0 };
    cell.count += 1;
    cell.amount += amount;
    heatmapMap.set(heatKey, cell);

    const sourceName = order.order_source?.trim() || "미기록";
    const source = sourceMap.get(sourceName) ?? { name: sourceName, count: 0, amount: 0 };
    source.count += 1;
    source.amount += amount;
    sourceMap.set(sourceName, source);

    const clothingName = order.clothing_type?.trim() || "기타";
    const clothing = clothingMap.get(clothingName) ?? { name: clothingName, count: 0, amount: 0 };
    clothing.count += 1;
    clothing.amount += amount;
    clothingMap.set(clothingName, clothing);

    const repairName = order.repair_type?.trim() || "기타";
    const repair = repairMap.get(repairName) ?? { name: repairName, count: 0, amount: 0 };
    repair.count += 1;
    repair.amount += amount;
    repairMap.set(repairName, repair);
  }

  paymentsByWeekday.forEach((bucket, i) => {
    bucket.users = weekdayUsers[i].size;
  });
  paymentsByHour.forEach((bucket, i) => {
    bucket.users = hourUsers[i].size;
  });

  for (const event of input.events) {
    const { weekday, ymd } = kstParts(event.created_at);
    visitsByWeekday[weekday].count += 1;
    if (event.user_id) {
      visitUsers[weekday].add(event.user_id);
      visitorIds.add(event.user_id);
      ensureDay(ymd).visitorIds.add(event.user_id);
    }
  }
  visitsByWeekday.forEach((bucket, i) => {
    bucket.users = visitUsers[i].size;
  });

  const eventCounts = new Map<string, number>();
  const sessionFirst = new Map<string, (typeof input.events)[number]>();
  const sortedEvents = [...input.events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  sortedEvents.forEach((event, index) => {
    const path = classifyAccessPath({
      referrer: event.referrer,
      page_url: event.page_url,
      metadata: event.metadata,
      device_os: event.device_os,
      app_version: event.app_version,
    });
    eventCounts.set(path, (eventCounts.get(path) || 0) + 1);
    const sessionKey = event.session_id || `anon:${event.created_at}:${index}`;
    if (!sessionFirst.has(sessionKey)) sessionFirst.set(sessionKey, event);
  });

  const pathMap = new Map<string, AccessPathStat & { userIds: Set<string> }>();
  for (const event of sessionFirst.values()) {
    const name = classifyAccessPath({
      referrer: event.referrer,
      page_url: event.page_url,
      metadata: event.metadata,
      device_os: event.device_os,
      app_version: event.app_version,
    });
    const row = pathMap.get(name) ?? {
      name,
      sessions: 0,
      users: 0,
      events: 0,
      userIds: new Set<string>(),
    };
    row.sessions += 1;
    if (event.user_id) row.userIds.add(event.user_id);
    pathMap.set(name, row);
  }
  const accessPaths = [...pathMap.values()]
    .map((row) => ({
      name: row.name,
      sessions: row.sessions,
      users: row.userIds.size,
      events: eventCounts.get(row.name) || 0,
    }))
    .sort((a, b) => b.sessions - a.sessions || b.users - a.users || b.events - a.events);

  for (const user of input.users) {
    const { weekday, ymd } = kstParts(user.created_at);
    signupsByWeekday[weekday].count += 1;
    ensureDay(ymd).signups += 1;
  }

  const rangeStart = input.startDate || [...dailyMap.keys()].sort()[0];
  const rangeEnd = input.endDate || [...dailyMap.keys()].sort().at(-1);
  const daily = (rangeStart && rangeEnd ? eachYmd(rangeStart, rangeEnd) : []).map((date) => {
    const row = ensureDay(date);
    return {
      date,
      signups: row.signups,
      payers: row.payerIds.size,
      payments: row.payments,
      amount: row.amount,
      visitors: row.visitorIds.size,
    };
  });

  const heatmap: HeatCell[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      heatmap.push(heatmapMap.get(`${weekday}-${hour}`) ?? { weekday, hour, count: 0, amount: 0 });
    }
  }

  const peakPayDay = peak(paymentsByWeekday);
  const peakPayHour = peak(paymentsByHour);
  const peakVisitDay = peak(visitsByWeekday.map((b) => ({ ...b, count: b.users || b.count })));
  const peakSignupDay = peak(signupsByWeekday);
  const topClothing = topNamed([...clothingMap.values()], 1)[0];
  const topRepair = topNamed([...repairMap.values()], 1)[0];
  const sources = topNamed([...sourceMap.values()]);
  const appShare = sources
    .filter((s) => ["app", "ios", "android"].includes(s.name.toLowerCase()))
    .reduce((sum, s) => sum + s.count, 0);
  const webShare = sources.filter((s) => s.name.toLowerCase() === "web").reduce((sum, s) => sum + s.count, 0);

  const insights: MarketingInsight[] = [];
  if (peakPayDay && peakPayDay.count > 0) {
    const share = Math.round((peakPayDay.count / paid.length) * 100);
    insights.push({
      title: "결제 피크 요일",
      body: `${peakPayDay.label}요일에 결제가 가장 많습니다 (${peakPayDay.count}건 · ${share}%). 프로모션은 하루 전~당일 오전에 노출하세요.`,
    });
  }
  if (peakPayHour && peakPayHour.count > 0) {
    const pushHour = Math.max(0, peakPayHour.key - 2);
    insights.push({
      title: "결제 피크 시간",
      body: `${peakPayHour.label}에 결제가 몰립니다 (${peakPayHour.count}건). 푸시·알림톡은 ${pushHour}~${peakPayHour.key}시 사이에 보내는 것이 좋습니다.`,
    });
  }
  if (peakVisitDay && peakPayDay && peakVisitDay.key !== peakPayDay.key && peakVisitDay.count > 0) {
    insights.push({
      title: "접속과 결제의 시차",
      body: `접속은 ${peakVisitDay.label}요일, 결제는 ${peakPayDay.label}요일에 많습니다. ${peakVisitDay.label}요일 방문객을 결제까지 이끄는 쿠폰을 검토하세요.`,
    });
  }
  if (peakSignupDay && peakSignupDay.count > 0) {
    insights.push({
      title: "신규 가입",
      body: `가입이 가장 많은 날은 ${peakSignupDay.label}요일입니다 (${peakSignupDay.count}명). 초대·가입 적립 안내는 이 요일에 맞추세요.`,
    });
  }
  if (topClothing) {
    insights.push({
      title: "잘 팔리는 의류",
      body: `${topClothing.name} 주문이 ${topClothing.count}건으로 가장 많습니다. 배너·홈 노출을 여기에 맞추세요.`,
    });
  }
  if (topRepair) {
    insights.push({
      title: "잘 팔리는 수선",
      body: `${topRepair.name}이(가) ${topRepair.count}건입니다. 가격 안내와 가이드를 이 항목 중심으로 강조하세요.`,
    });
  }
  const topPath = accessPaths[0];
  const pathSessions = accessPaths.reduce((sum, item) => sum + item.sessions, 0);
  if (topPath && pathSessions > 0) {
    const share = Math.round((topPath.sessions / pathSessions) * 100);
    insights.push({
      title: "제일 많은 접속 경로",
      body: `${topPath.name}에서 온 접속이 가장 많습니다 (${topPath.sessions.toLocaleString()}회 · ${share}%). 광고·콘텐츠는 이 채널을 우선하세요.`,
    });
  }
  if (paid.length > 0 && (appShare || webShare)) {
    const appPct = Math.round((appShare / paid.length) * 100);
    insights.push({
      title: "주문 채널",
      body: `결제 ${paid.length}건 중 앱 ${appShare}건(${appPct}%), 웹 ${webShare}건. 앱/웹 전환 차이는 주문 완료 채널 기준입니다.`,
    });
  }
  if (insights.length === 0) {
    insights.push({
      title: "데이터 부족",
      body: "선택한 기간에 결제·접속 기록이 거의 없습니다. 기간을 넓히거나 이벤트가 쌓인 뒤 다시 확인하세요.",
    });
  }

  return {
    range: { startDate: input.startDate, endDate: input.endDate },
    totals: {
      paidOrders: paid.length,
      paidAmount,
      aov: paid.length ? Math.round(paidAmount / paid.length) : 0,
      signups: input.users.length,
      visitors: visitorIds.size,
      events: input.events.length,
    },
    paymentsByWeekday,
    paymentsByHour,
    visitsByWeekday,
    signupsByWeekday,
    heatmap,
    sources,
    clothing: topNamed([...clothingMap.values()]),
    repairs: topNamed([...repairMap.values()]),
    daily,
    accessPaths,
    compare: input.startDate && input.endDate ? compareDailyPeriods(daily, input.startDate, input.endDate) : null,
    insights,
  };
}
