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
  insights: MarketingInsight[];
};

export function kstParts(iso: string): { weekday: number; hour: number } {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return { weekday: kst.getUTCDay(), hour: kst.getUTCHours() };
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

  for (const order of paid) {
    const when = order.paid_at || order.created_at;
    const { weekday, hour } = kstParts(when);
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
    const { weekday } = kstParts(event.created_at);
    visitsByWeekday[weekday].count += 1;
    if (event.user_id) {
      visitUsers[weekday].add(event.user_id);
      visitorIds.add(event.user_id);
    }
  }
  visitsByWeekday.forEach((bucket, i) => {
    bucket.users = visitUsers[i].size;
  });

  for (const user of input.users) {
    const { weekday } = kstParts(user.created_at);
    signupsByWeekday[weekday].count += 1;
  }

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
  if (paid.length > 0 && (appShare || webShare)) {
    const appPct = Math.round((appShare / paid.length) * 100);
    insights.push({
      title: "유입 채널",
      body: `결제 ${paid.length}건 중 앱 ${appShare}건(${appPct}%), 웹 ${webShare}건. 광고 예산을 비중이 큰 쪽에 우선 두세요.`,
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
    insights,
  };
}
