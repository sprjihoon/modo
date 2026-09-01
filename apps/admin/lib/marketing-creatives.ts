import { isPaidOrder } from "./marketing-insights";

const ATTRIBUTION_MS = 7 * 24 * 60 * 60 * 1000;

export type CreativeStat = {
  id: string;
  kind: "banner" | "popup";
  title: string;
  is_active: boolean;
  clicks: number;
  users: number;
  payments: number;
  amount: number;
};

export function buildCreativeStats(input: {
  banners: Array<{ id: string; title: string; is_active: boolean }>;
  popups: Array<{ id: string; title: string; is_active: boolean }>;
  clicks: Array<{
    target_id?: string | null;
    target_type?: string | null;
    user_id?: string | null;
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
}): CreativeStat[] {
  const creatives = new Map<string, CreativeStat & { userIds: Set<string>; payerIds: Set<string> }>();

  const ensure = (id: string, kind: "banner" | "popup", title: string, is_active: boolean) => {
    const current = creatives.get(id);
    if (current) return current;
    const created = {
      id,
      kind,
      title,
      is_active,
      clicks: 0,
      users: 0,
      payments: 0,
      amount: 0,
      userIds: new Set<string>(),
      payerIds: new Set<string>(),
    };
    creatives.set(id, created);
    return created;
  };

  for (const banner of input.banners) {
    ensure(banner.id, "banner", banner.title, banner.is_active);
  }
  for (const popup of input.popups) {
    ensure(popup.id, "popup", popup.title, popup.is_active);
  }

  const paid = input.orders
    .filter((order) => order.user_id && isPaidOrder(order))
    .map((order) => ({
      user_id: order.user_id as string,
      at: new Date(order.paid_at || order.created_at).getTime(),
      amount: Number(order.total_price) || 0,
    }));

  for (const click of input.clicks) {
    if (!click.target_id) continue;
    const kind = click.target_type === "popup" ? "popup" : "banner";
    const row = ensure(click.target_id, kind, kind === "popup" ? "삭제된 팝업" : "삭제된 배너", false);
    row.clicks += 1;
    if (click.user_id) row.userIds.add(click.user_id);
    if (!click.user_id) continue;
    const clickedAt = new Date(click.created_at).getTime();
    const converted = paid.find(
      (order) =>
        order.user_id === click.user_id &&
        order.at >= clickedAt &&
        order.at <= clickedAt + ATTRIBUTION_MS
    );
    if (converted && !row.payerIds.has(click.user_id)) {
      row.payerIds.add(click.user_id);
      row.payments += 1;
      row.amount += converted.amount;
    }
  }

  return [...creatives.values()]
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      is_active: row.is_active,
      clicks: row.clicks,
      users: row.userIds.size,
      payments: row.payments,
      amount: row.amount,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.amount - a.amount);
}
