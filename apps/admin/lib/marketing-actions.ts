import { isPaidOrder } from "./marketing-insights";

export const ABANDON_EVENT_TYPES = ["CART_ADD", "ORDER_START", "ORDER_PAYMENT_START"] as const;
export const PAID_EVENT_TYPES = ["ORDER_PAYMENT_SUCCESS", "ORDER_COMPLETE"] as const;

export type ActionCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_paid_at: string | null;
  last_intent_at: string | null;
  paid_orders: number;
  paid_amount: number;
  days_quiet: number;
  reason: string;
};

export type CouponStat = {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  uses: number;
  users: number;
  revenue: number;
  discount: number;
  aov: number;
  new_customers: number;
  repeat_customers: number;
};

export type MarketingActionsData = {
  counts: {
    quiet30: number;
    quiet60: number;
    oneShot: number;
    abandon: number;
  };
  quiet30: ActionCustomer[];
  quiet60: ActionCustomer[];
  oneShot: ActionCustomer[];
  abandon: ActionCustomer[];
  coupons: CouponStat[];
};

export function isDeletedCustomer(email?: string | null): boolean {
  return Boolean(email && email.startsWith("deleted_") && email.includes("@deleted."));
}

export function lastActivityAt(input: {
  created_at: string;
  last_seen_at?: string | null;
  last_paid_at?: string | null;
}): string {
  return [input.last_seen_at, input.last_paid_at, input.created_at]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) as string;
}

export function daysSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)));
}

function toCustomer(input: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_paid_at: string | null;
  last_intent_at?: string | null;
  paid_orders: number;
  paid_amount: number;
  nowMs: number;
  reason: string;
}): ActionCustomer {
  const activity = lastActivityAt(input);
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    created_at: input.created_at,
    last_seen_at: input.last_seen_at,
    last_paid_at: input.last_paid_at,
    last_intent_at: input.last_intent_at ?? null,
    paid_orders: input.paid_orders,
    paid_amount: input.paid_amount,
    days_quiet: daysSince(activity, input.nowMs),
    reason: input.reason,
  };
}

export function buildMarketingActions(input: {
  nowMs?: number;
  users: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at: string;
  }>;
  orders: Array<{
    user_id?: string | null;
    paid_at?: string | null;
    created_at: string;
    total_price?: number | null;
    payment_status?: string | null;
    status?: string | null;
  }>;
  lastSeen: Array<{ user_id?: string | null; created_at: string }>;
  abandonEvents: Array<{
    user_id?: string | null;
    created_at: string;
    event_type: string;
  }>;
  promotions: Array<{
    id: string;
    code: string;
    description?: string | null;
    is_active: boolean;
    used_count?: number | null;
  }>;
  usages: Array<{
    promotion_code_id: string;
    user_id: string;
    order_id: string;
    discount_amount?: number | null;
    final_amount?: number | null;
    original_amount?: number | null;
    used_at: string;
  }>;
}): MarketingActionsData {
  const nowMs = input.nowMs ?? Date.now();
  const lastSeenMap = new Map<string, string>();
  for (const row of input.lastSeen) {
    if (!row.user_id) continue;
    const current = lastSeenMap.get(row.user_id);
    if (!current || row.created_at > current) lastSeenMap.set(row.user_id, row.created_at);
  }

  const paidByUser = new Map<string, { count: number; amount: number; lastPaidAt: string; firstPaidAt: string }>();
  for (const order of input.orders) {
    if (!order.user_id || !isPaidOrder(order)) continue;
    const when = order.paid_at || order.created_at;
    const current = paidByUser.get(order.user_id);
    const amount = Number(order.total_price) || 0;
    if (!current) {
      paidByUser.set(order.user_id, { count: 1, amount, lastPaidAt: when, firstPaidAt: when });
      continue;
    }
    current.count += 1;
    current.amount += amount;
    if (when > current.lastPaidAt) current.lastPaidAt = when;
    if (when < current.firstPaidAt) current.firstPaidAt = when;
  }

  const quiet30: ActionCustomer[] = [];
  const quiet60: ActionCustomer[] = [];
  const oneShot: ActionCustomer[] = [];

  for (const user of input.users) {
    if (isDeletedCustomer(user.email)) continue;
    const paid = paidByUser.get(user.id);
    const last_seen_at = lastSeenMap.get(user.id) ?? null;
    const last_paid_at = paid?.lastPaidAt ?? null;
    const activity = lastActivityAt({
      created_at: user.created_at,
      last_seen_at,
      last_paid_at,
    });
    const quiet = daysSince(activity, nowMs);
    const base = {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      created_at: user.created_at,
      last_seen_at,
      last_paid_at,
      paid_orders: paid?.count ?? 0,
      paid_amount: paid?.amount ?? 0,
      nowMs,
    };
    if (quiet >= 30) {
      quiet30.push(toCustomer({ ...base, reason: `${quiet}일 동안 접속·결제 없음` }));
    }
    if (quiet >= 60) {
      quiet60.push(toCustomer({ ...base, reason: `${quiet}일 동안 접속·결제 없음` }));
    }
    if ((paid?.count ?? 0) === 1 && last_paid_at && daysSince(last_paid_at, nowMs) >= 30) {
      oneShot.push(toCustomer({ ...base, reason: "1회 결제 후 재구매 없음" }));
    }
  }

  const sortQuiet = (a: ActionCustomer, b: ActionCustomer) => b.days_quiet - a.days_quiet || b.paid_amount - a.paid_amount;
  quiet30.sort(sortQuiet);
  quiet60.sort(sortQuiet);
  oneShot.sort(sortQuiet);

  const lastIntent = new Map<string, string>();
  const lastPaidEvent = new Map<string, string>();
  for (const event of input.abandonEvents) {
    if (!event.user_id) continue;
    if ((ABANDON_EVENT_TYPES as readonly string[]).includes(event.event_type)) {
      const current = lastIntent.get(event.user_id);
      if (!current || event.created_at > current) lastIntent.set(event.user_id, event.created_at);
    }
    if ((PAID_EVENT_TYPES as readonly string[]).includes(event.event_type)) {
      const current = lastPaidEvent.get(event.user_id);
      if (!current || event.created_at > current) lastPaidEvent.set(event.user_id, event.created_at);
    }
  }

  const abandon: ActionCustomer[] = [];
  const userById = new Map(input.users.map((user) => [user.id, user]));
  for (const [userId, intentAt] of lastIntent) {
    const user = userById.get(userId);
    if (!user || isDeletedCustomer(user.email)) continue;
    const paid = paidByUser.get(userId);
    const paidAfterIntent = Boolean(
      (paid?.lastPaidAt && paid.lastPaidAt >= intentAt) ||
      (lastPaidEvent.get(userId) && (lastPaidEvent.get(userId) as string) >= intentAt)
    );
    if (paidAfterIntent) continue;
    abandon.push(
      toCustomer({
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        phone: user.phone ?? null,
        created_at: user.created_at,
        last_seen_at: lastSeenMap.get(user.id) ?? null,
        last_paid_at: paid?.lastPaidAt ?? null,
        last_intent_at: intentAt,
        paid_orders: paid?.count ?? 0,
        paid_amount: paid?.amount ?? 0,
        nowMs,
        reason: "장바구니·결제 시작 후 미결제",
      })
    );
  }
  abandon.sort((a, b) => (b.last_intent_at || "").localeCompare(a.last_intent_at || ""));

  const firstPaidAt = new Map<string, string>();
  for (const [userId, paid] of paidByUser) {
    firstPaidAt.set(userId, paid.firstPaidAt);
  }

  const couponMap = new Map<string, CouponStat & { userIds: Set<string>; newIds: Set<string>; repeatIds: Set<string> }>();
  for (const promo of input.promotions) {
    couponMap.set(promo.id, {
      id: promo.id,
      code: promo.code,
      description: promo.description ?? null,
      is_active: promo.is_active,
      uses: 0,
      users: 0,
      revenue: 0,
      discount: 0,
      aov: 0,
      new_customers: 0,
      repeat_customers: 0,
      userIds: new Set<string>(),
      newIds: new Set<string>(),
      repeatIds: new Set<string>(),
    });
  }

  for (const usage of input.usages) {
    const row = couponMap.get(usage.promotion_code_id);
    if (!row) continue;
    row.uses += 1;
    row.revenue += Number(usage.final_amount) || 0;
    row.discount += Number(usage.discount_amount) || 0;
    row.userIds.add(usage.user_id);
    const first = firstPaidAt.get(usage.user_id);
    if (first && Math.abs(new Date(first).getTime() - new Date(usage.used_at).getTime()) <= 24 * 60 * 60 * 1000) {
      row.newIds.add(usage.user_id);
    } else if (first && first < usage.used_at) {
      row.repeatIds.add(usage.user_id);
    } else {
      row.newIds.add(usage.user_id);
    }
  }

  const coupons = [...couponMap.values()]
    .map((row) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      is_active: row.is_active,
      uses: row.uses,
      users: row.userIds.size,
      revenue: row.revenue,
      discount: row.discount,
      aov: row.uses ? Math.round(row.revenue / row.uses) : 0,
      new_customers: row.newIds.size,
      repeat_customers: row.repeatIds.size,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.uses - a.uses);

  return {
    counts: {
      quiet30: quiet30.length,
      quiet60: quiet60.length,
      oneShot: oneShot.length,
      abandon: abandon.length,
    },
    quiet30,
    quiet60,
    oneShot,
    abandon,
    coupons,
  };
}
