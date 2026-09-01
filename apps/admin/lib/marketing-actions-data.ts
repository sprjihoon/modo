import { supabaseAdmin } from "./supabase";
import { ABANDON_EVENT_TYPES, PAID_EVENT_TYPES, buildMarketingActions, type MarketingActionsData } from "./marketing-actions";
import { buildCreativeStats, type CreativeStat } from "./marketing-creatives";
import { addDaysYmd } from "./marketing-insights";

async function fetchAll<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

export async function loadMarketingActions(): Promise<{
  actions: MarketingActionsData;
  creatives: CreativeStat[];
}> {
  const today = addDaysYmd(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), 0);
  const abandonFrom = `${addDaysYmd(today, -30)}T00:00:00+09:00`;
  const seenFrom = `${addDaysYmd(today, -180)}T00:00:00+09:00`;
  const clickFrom = `${addDaysYmd(today, -90)}T00:00:00+09:00`;

  const [users, orders, lastSeen, abandonEvents, promotions, usages, banners, popups, clicks] = await Promise.all([
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("users")
        .select("id, name, email, phone, created_at")
        .eq("role", "CUSTOMER")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("orders")
        .select("id, user_id, paid_at, created_at, total_price, payment_status, status, promotion_code_id, promotion_discount_amount")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("customer_events")
        .select("user_id, created_at, device_os, app_version")
        .not("user_id", "is", null)
        .gte("created_at", seenFrom)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("customer_events")
        .select("user_id, created_at, event_type")
        .in("event_type", [...ABANDON_EVENT_TYPES, ...PAID_EVENT_TYPES])
        .not("user_id", "is", null)
        .gte("created_at", abandonFrom)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("promotion_codes")
        .select("id, code, description, is_active, used_count")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("promotion_code_usages")
        .select("promotion_code_id, user_id, order_id, discount_amount, final_amount, original_amount, used_at")
        .order("used_at", { ascending: false })
        .range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin.from("banners").select("id, title, is_active").order("display_order").range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin.from("popups").select("id, title, is_active").order("display_priority").range(from, to)
    ),
    fetchAll(async (from, to) =>
      supabaseAdmin
        .from("customer_events")
        .select("target_id, target_type, user_id, created_at")
        .eq("event_type", "BANNER_CLICK")
        .gte("created_at", clickFrom)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
  ]);

  return {
    actions: buildMarketingActions({
      users,
      orders,
      lastSeen,
      abandonEvents,
      promotions,
      usages,
    }),
    creatives: buildCreativeStats({ banners, popups, clicks, orders }),
  };
}
