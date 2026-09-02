import {
  classifyAccessPath,
  eachYmd,
  inKstRange,
  isPaidOrder,
} from "./marketing-insights";

export const AD_SPEND_SOURCES = [
  { key: "naver", label: "네이버" },
  { key: "instagram", label: "인스타그램" },
  { key: "google", label: "구글" },
  { key: "youtube", label: "유튜브" },
  { key: "facebook", label: "페이스북" },
  { key: "kakao", label: "카카오" },
  { key: "tiktok", label: "틱톡" },
] as const;

const SOURCE_RULES: Array<{ key: string; label: string; match: RegExp }> = [
  { key: "naver", label: "네이버", match: /naver|네이버/i },
  { key: "instagram", label: "인스타그램", match: /insta|ig\b|인스타/i },
  { key: "youtube", label: "유튜브", match: /youtube|youtu\.be|유튜브/i },
  { key: "google", label: "구글", match: /google|구글/i },
  { key: "facebook", label: "페이스북", match: /facebook|fb\b|페이스북|메타/i },
  { key: "kakao", label: "카카오", match: /kakao|daum|카카오|다음/i },
  { key: "tiktok", label: "틱톡", match: /tiktok|틱톡/i },
  { key: "threads", label: "스레드", match: /threads|스레드/i },
  { key: "twitter", label: "트위터", match: /twitter|x\.com|트위터/i },
];

export type Acquisition = {
  sourceKey: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

export type AdSpendRow = {
  id?: string;
  source: string;
  campaign?: string | null;
  start_date: string;
  end_date: string;
  amount: number;
  note?: string | null;
};

export type AdPerformanceRow = {
  sourceKey: string;
  source: string;
  campaign: string;
  signups: number;
  signupPayers: number;
  orders: number;
  revenue: number;
  newPayers: number;
  spend: number;
  signupCpa: number | null;
  orderCpa: number | null;
  cac: number | null;
  signupToPayRate: number | null;
  roas: number | null;
  verdict: string;
  verdictKey: "need_spend" | "keep" | "review" | "cut" | "repeat_only" | "organic";
};

export type AdPerformanceData = {
  range: { startDate: string; endDate: string };
  totals: AdPerformanceRow;
  channels: AdPerformanceRow[];
  campaigns: AdPerformanceRow[];
  spends: AdSpendRow[];
};

export type AdEvent = {
  created_at: string;
  user_id?: string | null;
  referrer?: string | null;
  page_url?: string | null;
  metadata?: Record<string, unknown> | null;
  device_os?: string | null;
  app_version?: string | null;
};

export type AdUser = {
  id: string;
  created_at: string;
  email?: string | null;
  acq_source?: string | null;
  acq_medium?: string | null;
  acq_campaign?: string | null;
  acq_content?: string | null;
  acq_term?: string | null;
};

export type AdOrder = {
  user_id?: string | null;
  paid_at?: string | null;
  created_at: string;
  total_price?: number | null;
  payment_status?: string | null;
  status?: string | null;
  acq_source?: string | null;
  acq_medium?: string | null;
  acq_campaign?: string | null;
  acq_content?: string | null;
  acq_term?: string | null;
};

const UNKNOWN: Acquisition = {
  sourceKey: "unknown",
  source: "미기록",
  medium: "",
  campaign: "",
  content: "",
  term: "",
};

export function isDeletedCustomerEmail(email?: string | null): boolean {
  return Boolean(email && email.toLowerCase().startsWith("deleted_"));
}

export function normalizeSource(raw?: string | null): { key: string; label: string } {
  const value = (raw || "").trim();
  if (!value) return { key: "unknown", label: "미기록" };
  const hit = SOURCE_RULES.find((rule) => rule.match.test(value));
  if (hit) return { key: hit.key, label: hit.label };
  return { key: value.toLowerCase(), label: value };
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function utmField(record: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!record) return "";
  for (const key of keys) {
    const found = textOf(record[key]);
    if (found) return found;
  }
  return "";
}

function utmFromUrl(url: string | null | undefined, key: string): string {
  if (!url) return "";
  try {
    return new URL(url, "https://modo.io.kr").searchParams.get(key) || "";
  } catch {
    return "";
  }
}

export function acquisitionFromStored(input: {
  acq_source?: string | null;
  acq_medium?: string | null;
  acq_campaign?: string | null;
  acq_content?: string | null;
  acq_term?: string | null;
}): Acquisition | null {
  const source = (input.acq_source || "").trim();
  if (!source) return null;
  const { key, label } = normalizeSource(source);
  return {
    sourceKey: key,
    source: label,
    medium: (input.acq_medium || "").trim(),
    campaign: (input.acq_campaign || "").trim(),
    content: (input.acq_content || "").trim(),
    term: (input.acq_term || "").trim(),
  };
}

export function acquisitionFromEvent(event?: AdEvent | null): Acquisition {
  if (!event) return { ...UNKNOWN };
  const meta = event.metadata && typeof event.metadata === "object" ? event.metadata : null;
  const source =
    utmField(meta, "utm_source", "utmSource", "source") ||
    utmFromUrl(event.page_url, "utm_source") ||
    utmFromUrl(event.page_url, "source");
  const medium =
    utmField(meta, "utm_medium", "utmMedium") || utmFromUrl(event.page_url, "utm_medium");
  const campaign =
    utmField(meta, "utm_campaign", "utmCampaign") || utmFromUrl(event.page_url, "utm_campaign");
  const content =
    utmField(meta, "utm_content", "utmContent") || utmFromUrl(event.page_url, "utm_content");
  const term = utmField(meta, "utm_term", "utmTerm") || utmFromUrl(event.page_url, "utm_term");
  if (source) {
    const { key, label } = normalizeSource(source);
    return { sourceKey: key, source: label, medium, campaign, content, term };
  }
  const path = classifyAccessPath(event);
  const { key, label } = normalizeSource(path === "미기록" ? "" : path);
  return {
    sourceKey: key,
    source: path === "직접 접속" ? "직접 접속" : label,
    medium,
    campaign,
    content,
    term,
  };
}

export function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (!start || !end || start > end) return 0;
  return eachYmd(start, end).length;
}

export function allocateSpend(
  spends: AdSpendRow[],
  startDate: string,
  endDate: string
): { channel: Map<string, number>; campaign: Map<string, number>; total: number } {
  const channel = new Map<string, number>();
  const campaign = new Map<string, number>();
  let total = 0;
  for (const spend of spends) {
    const days = Math.max(eachYmd(spend.start_date, spend.end_date).length, 1);
    const overlap = overlapDays(spend.start_date, spend.end_date, startDate, endDate);
    if (overlap <= 0) continue;
    const amount = Math.round((Number(spend.amount) || 0) * (overlap / days));
    if (amount <= 0) continue;
    const { key } = normalizeSource(spend.source);
    channel.set(key, (channel.get(key) || 0) + amount);
    const campaignName = (spend.campaign || "").trim();
    if (campaignName) {
      const ck = `${key}\t${campaignName}`;
      campaign.set(ck, (campaign.get(ck) || 0) + amount);
    }
    total += amount;
  }
  return { channel, campaign, total };
}

function ratio(numer: number, denom: number): number | null {
  if (!denom) return null;
  return Math.round(numer / denom);
}

function rate(numer: number, denom: number): number | null {
  if (!denom) return null;
  return Math.round((numer / denom) * 1000) / 10;
}

export function verdictFor(row: Omit<AdPerformanceRow, "verdict" | "verdictKey">): {
  verdict: string;
  verdictKey: AdPerformanceRow["verdictKey"];
} {
  const paidLike = row.sourceKey === "all" || SOURCE_RULES.some((rule) => rule.key === row.sourceKey);
  if (!paidLike && row.spend <= 0) {
    return { verdict: "유기·직접 유입", verdictKey: "organic" };
  }
  if (row.spend <= 0) {
    return { verdict: "광고비 입력 후 판단", verdictKey: "need_spend" };
  }
  if (row.signups === 0 && row.orders === 0 && row.newPayers === 0) {
    return { verdict: "전환 없음 · 정리 후보", verdictKey: "cut" };
  }
  if (row.signups > 0 && row.signupPayers === 0 && row.newPayers === 0) {
    return { verdict: "가입만 있고 결제 없음 · 정리 검토", verdictKey: "review" };
  }
  if (row.orders > 0 && row.newPayers === 0) {
    return { verdict: "기존 고객 재클릭 · CAC 없음", verdictKey: "repeat_only" };
  }
  return { verdict: "유지 후보 · CAC를 목표와 비교", verdictKey: "keep" };
}

function emptyCounts() {
  return { signups: 0, signupPayers: 0, orders: 0, revenue: 0, newPayers: 0 };
}

type Counts = ReturnType<typeof emptyCounts>;

function campaignLabel(campaign: string): string {
  return campaign.trim() || "(캠페인 없음)";
}

function finishRow(
  base: Omit<AdPerformanceRow, "signupCpa" | "orderCpa" | "cac" | "signupToPayRate" | "roas" | "verdict" | "verdictKey">
): AdPerformanceRow {
  const signupCpa = ratio(base.spend, base.signups);
  const orderCpa = ratio(base.spend, base.orders);
  const cac = ratio(base.spend, base.newPayers);
  const signupToPayRate = rate(base.signupPayers, base.signups);
  const roas = base.spend > 0 ? Math.round((base.revenue / base.spend) * 100) / 100 : null;
  const computed = { ...base, signupCpa, orderCpa, cac, signupToPayRate, roas };
  return { ...computed, ...verdictFor(computed) };
}

function addCount(map: Map<string, Counts>, key: string, field: keyof Counts, amount = 1) {
  const current = map.get(key) ?? emptyCounts();
  current[field] += amount;
  map.set(key, current);
}

export function buildAdPerformance(input: {
  startDate: string;
  endDate: string;
  users: AdUser[];
  orders: AdOrder[];
  events: AdEvent[];
  spends: AdSpendRow[];
}): AdPerformanceData {
  const { startDate, endDate } = input;
  const users = input.users.filter((user) => !isDeletedCustomerEmail(user.email));
  const paid = input.orders.filter(isPaidOrder);
  const eventsByUser = new Map<string, AdEvent[]>();
  for (const event of [...input.events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!event.user_id) continue;
    const list = eventsByUser.get(event.user_id) ?? [];
    list.push(event);
    eventsByUser.set(event.user_id, list);
  }

  const firstEvent = (userId: string) => eventsByUser.get(userId)?.[0] ?? null;
  const lastEventAt = (userId: string, iso: string) => {
    const list = eventsByUser.get(userId) || [];
    let found: AdEvent | null = null;
    for (const event of list) {
      if (event.created_at <= iso) found = event;
    }
    return found;
  };

  const firstTouch = (user: AdUser): Acquisition =>
    acquisitionFromStored(user) || acquisitionFromEvent(firstEvent(user.id));

  const lastTouch = (order: AdOrder): Acquisition => {
    const stored = acquisitionFromStored(order);
    if (stored) return stored;
    if (order.user_id) {
      return acquisitionFromEvent(lastEventAt(order.user_id, order.paid_at || order.created_at) || firstEvent(order.user_id));
    }
    return { ...UNKNOWN };
  };

  const firstPaidAt = new Map<string, string>();
  const paidEver = new Set<string>();
  for (const order of [...paid].sort((a, b) => (a.paid_at || a.created_at).localeCompare(b.paid_at || b.created_at))) {
    if (!order.user_id) continue;
    paidEver.add(order.user_id);
    if (!firstPaidAt.has(order.user_id)) firstPaidAt.set(order.user_id, order.paid_at || order.created_at);
  }

  const channelCounts = new Map<string, Counts>();
  const campaignCounts = new Map<string, Counts>();
  const channelMeta = new Map<string, { source: string }>();

  const bump = (acq: Acquisition, field: keyof Counts, amount = 1) => {
    addCount(channelCounts, acq.sourceKey, field, amount);
    addCount(campaignCounts, `${acq.sourceKey}\t${campaignLabel(acq.campaign)}`, field, amount);
    channelMeta.set(acq.sourceKey, { source: acq.source });
  };

  for (const user of users) {
    if (!inKstRange(user.created_at, startDate, endDate)) continue;
    const acq = firstTouch(user);
    bump(acq, "signups");
    if (paidEver.has(user.id)) bump(acq, "signupPayers");
  }

  for (const order of paid) {
    if (!inKstRange(order.paid_at || order.created_at, startDate, endDate)) continue;
    const acq = lastTouch(order);
    bump(acq, "orders");
    bump(acq, "revenue", Number(order.total_price) || 0);
  }

  for (const [userId, when] of firstPaidAt) {
    if (!inKstRange(when, startDate, endDate)) continue;
    const user = users.find((row) => row.id === userId);
    const acq = user ? firstTouch(user) : acquisitionFromEvent(firstEvent(userId));
    bump(acq, "newPayers");
  }

  const spent = allocateSpend(input.spends, startDate, endDate);
  const keys = new Set<string>([
    ...channelCounts.keys(),
    ...spent.channel.keys(),
  ]);

  const channels = [...keys]
    .map((sourceKey) => {
      const counts = channelCounts.get(sourceKey) ?? emptyCounts();
      const source = channelMeta.get(sourceKey)?.source || normalizeSource(sourceKey).label;
      return finishRow({
        sourceKey,
        source,
        campaign: "",
        ...counts,
        spend: spent.channel.get(sourceKey) || 0,
      });
    })
    .sort((a, b) => b.spend - a.spend || b.revenue - a.revenue || b.signups - a.signups);

  const campaignKeys = new Set<string>([...campaignCounts.keys(), ...spent.campaign.keys()]);
  const campaigns = [...campaignKeys]
    .map((key) => {
      const [sourceKey, campaign] = key.split("\t");
      const counts = campaignCounts.get(key) ?? emptyCounts();
      const source = channelMeta.get(sourceKey)?.source || normalizeSource(sourceKey).label;
      return finishRow({
        sourceKey,
        source,
        campaign,
        ...counts,
        spend: spent.campaign.get(key) || 0,
      });
    })
    .sort((a, b) => b.spend - a.spend || b.revenue - a.revenue || b.signups - a.signups);

  const totals = finishRow({
    sourceKey: "all",
    source: "전체",
    campaign: "",
    signups: channels.reduce((sum, row) => sum + row.signups, 0),
    signupPayers: channels.reduce((sum, row) => sum + row.signupPayers, 0),
    orders: channels.reduce((sum, row) => sum + row.orders, 0),
    revenue: channels.reduce((sum, row) => sum + row.revenue, 0),
    newPayers: channels.reduce((sum, row) => sum + row.newPayers, 0),
    spend: spent.total,
  });

  return {
    range: { startDate, endDate },
    totals,
    channels,
    campaigns,
    spends: input.spends.filter((row) => overlapDays(row.start_date, row.end_date, startDate, endDate) > 0),
  };
}
