import { inKstRange, isPaidOrder } from "./marketing-insights";

export type RepeatStats = {
  firstBuyers: number;
  repeatBuyers: number;
  firstOrders: number;
  repeatOrders: number;
  firstAmount: number;
  repeatAmount: number;
  repeatRate: number;
  avgDaysToSecond: number | null;
  dueForSecond: number;
};

export type RegionStat = {
  name: string;
  count: number;
  amount: number;
  users: number;
};

const REGION_RULES: Array<{ name: string; match: RegExp }> = [
  { name: "서울", match: /서울/ },
  { name: "경기", match: /경기/ },
  { name: "인천", match: /인천/ },
  { name: "부산", match: /부산/ },
  { name: "대구", match: /대구/ },
  { name: "대전", match: /대전/ },
  { name: "광주", match: /광주/ },
  { name: "울산", match: /울산/ },
  { name: "세종", match: /세종/ },
  { name: "강원", match: /강원/ },
  { name: "충북", match: /충북|충청북/ },
  { name: "충남", match: /충남|충청남/ },
  { name: "전북", match: /전북|전라북|전북특별/ },
  { name: "전남", match: /전남|전라남/ },
  { name: "경북", match: /경북|경상북/ },
  { name: "경남", match: /경남|경상남/ },
  { name: "제주", match: /제주/ },
];

export function parseRegion(address?: string | null): string {
  const raw = (address || "").replace(/\s+/g, " ").trim();
  if (!raw) return "주소 없음";
  const hit = REGION_RULES.find((rule) => rule.match.test(raw));
  return hit?.name ?? "기타";
}

function paidWhen(order: { paid_at?: string | null; created_at: string }): string {
  return order.paid_at || order.created_at;
}

export function buildRepeatStats(input: {
  orders: Array<{
    user_id?: string | null;
    paid_at?: string | null;
    created_at: string;
    total_price?: number | null;
    payment_status?: string | null;
    status?: string | null;
  }>;
  startDate?: string | null;
  endDate?: string | null;
  nowMs?: number;
}): RepeatStats {
  const nowMs = input.nowMs ?? Date.now();
  const paid = input.orders.filter((order) => order.user_id && isPaidOrder(order));
  const byUser = new Map<string, Array<{ at: string; amount: number }>>();
  for (const order of paid) {
    const userId = order.user_id as string;
    const list = byUser.get(userId) ?? [];
    list.push({ at: paidWhen(order), amount: Number(order.total_price) || 0 });
    byUser.set(userId, list);
  }
  for (const list of byUser.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at));
  }

  const gaps: number[] = [];
  let dueForSecond = 0;
  for (const list of byUser.values()) {
    if (list.length >= 2) {
      gaps.push(Math.max(0, Math.round((new Date(list[1].at).getTime() - new Date(list[0].at).getTime()) / (24 * 60 * 60 * 1000))));
    } else if (list.length === 1) {
      const quiet = Math.floor((nowMs - new Date(list[0].at).getTime()) / (24 * 60 * 60 * 1000));
      if (quiet >= 30) dueForSecond += 1;
    }
  }
  const avgDaysToSecond = gaps.length
    ? Math.round(gaps.reduce((sum, days) => sum + days, 0) / gaps.length)
    : null;

  let firstBuyers = 0;
  let repeatBuyers = 0;
  let firstOrders = 0;
  let repeatOrders = 0;
  let firstAmount = 0;
  let repeatAmount = 0;
  let periodBuyers = 0;
  let periodRepeatBuyers = 0;

  for (const list of byUser.values()) {
    const firstAt = list[0].at;
    const inPeriod = list.filter((row) =>
      input.startDate && input.endDate ? inKstRange(row.at, input.startDate, input.endDate) : true
    );
    if (inPeriod.length === 0) continue;
    periodBuyers += 1;
    if (list.length >= 2) periodRepeatBuyers += 1;
    if (!input.startDate || !input.endDate || inKstRange(firstAt, input.startDate, input.endDate)) firstBuyers += 1;
    if (inPeriod.some((row) => row.at !== firstAt)) repeatBuyers += 1;
    for (const row of inPeriod) {
      if (row.at === firstAt) {
        firstOrders += 1;
        firstAmount += row.amount;
      } else {
        repeatOrders += 1;
        repeatAmount += row.amount;
      }
    }
  }

  return {
    firstBuyers,
    repeatBuyers,
    firstOrders,
    repeatOrders,
    firstAmount,
    repeatAmount,
    repeatRate: periodBuyers ? Math.round((periodRepeatBuyers / periodBuyers) * 100) : 0,
    avgDaysToSecond,
    dueForSecond,
  };
}

export function buildRegionStats(input: {
  orders: Array<{
    user_id?: string | null;
    paid_at?: string | null;
    created_at: string;
    total_price?: number | null;
    payment_status?: string | null;
    status?: string | null;
    pickup_address?: string | null;
  }>;
}): RegionStat[] {
  const map = new Map<string, RegionStat & { userIds: Set<string> }>();
  for (const order of input.orders) {
    if (!isPaidOrder(order)) continue;
    const name = parseRegion(order.pickup_address);
    const row = map.get(name) ?? { name, count: 0, amount: 0, users: 0, userIds: new Set<string>() };
    row.count += 1;
    row.amount += Number(order.total_price) || 0;
    if (order.user_id) row.userIds.add(order.user_id);
    map.set(name, row);
  }
  return [...map.values()]
    .map((row) => ({ name: row.name, count: row.count, amount: row.amount, users: row.userIds.size }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);
}

export function attachLoyalty<T extends {
  insights: Array<{ title: string; body: string }>;
  repeat: RepeatStats;
  regions: RegionStat[];
}>(
  data: T,
  orders: Parameters<typeof buildRepeatStats>[0]["orders"],
  range: { startDate: string | null; endDate: string | null }
): T {
  data.repeat = buildRepeatStats({
    orders,
    startDate: range.startDate,
    endDate: range.endDate,
  });
  const startDate = range.startDate;
  const endDate = range.endDate;
  data.regions = buildRegionStats({
    orders: startDate && endDate
      ? orders.filter((order) => inKstRange(order.paid_at || order.created_at, startDate, endDate))
      : orders,
  });
  if (data.repeat.avgDaysToSecond) {
    data.insights.push({
      title: "두 번째 주문 주기",
      body: `첫 결제 후 두 번째까지 평균 ${data.repeat.avgDaysToSecond}일입니다. ${data.repeat.dueForSecond.toLocaleString()}명이 30일 넘게 재구매가 없습니다. 그 전에 쿠폰을 보내세요.`,
    });
  }
  if (data.repeat.firstBuyers || data.repeat.repeatBuyers) {
    data.insights.push({
      title: "첫 구매와 재구매",
      body: `이 기간 결제 고객 중 재구매율 ${data.repeat.repeatRate}%입니다. 첫 구매 ${data.repeat.firstOrders}건 · 재구매 ${data.repeat.repeatOrders}건.`,
    });
  }
  const topRegion = data.regions.find((row) => row.name !== "주소 없음");
  if (topRegion) {
    data.insights.push({
      title: "제일 많은 지역",
      body: `${topRegion.name} 주문이 ${topRegion.count}건으로 가장 많습니다. 지역 쿠폰·수거 안내는 여기를 우선하세요.`,
    });
  }
  return data;
}
