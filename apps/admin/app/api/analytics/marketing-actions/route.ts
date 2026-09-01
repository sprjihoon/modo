import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { ABANDON_EVENT_TYPES, PAID_EVENT_TYPES, buildMarketingActions } from "@/lib/marketing-actions";
import { addDaysYmd } from "@/lib/marketing-insights";

export const dynamic = "force-dynamic";

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

const LIST_LIMIT = 200;

function trimList<T>(rows: T[]): T[] {
  return rows.slice(0, LIST_LIMIT);
}

export async function GET() {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const today = addDaysYmd(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), 0);
    const abandonFrom = `${addDaysYmd(today, -30)}T00:00:00+09:00`;
    const seenFrom = `${addDaysYmd(today, -180)}T00:00:00+09:00`;

    const [users, orders, lastSeen, abandonEvents, promotions, usages] = await Promise.all([
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
          .select("user_id, paid_at, created_at, total_price, payment_status, status")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAll(async (from, to) =>
        supabaseAdmin
          .from("customer_events")
          .select("user_id, created_at")
          .not("user_id", "is", null)
          .gte("created_at", seenFrom)
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      fetchAll(async (from, to) => {
        let query = supabaseAdmin
          .from("customer_events")
          .select("user_id, created_at, event_type")
          .in("event_type", [...ABANDON_EVENT_TYPES, ...PAID_EVENT_TYPES])
          .not("user_id", "is", null)
          .gte("created_at", abandonFrom)
          .order("created_at", { ascending: false })
          .range(from, to);
        return query;
      }),
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
    ]);

    const data = buildMarketingActions({
      users,
      orders,
      lastSeen,
      abandonEvents,
      promotions,
      usages,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        quiet30: trimList(data.quiet30),
        quiet60: trimList(data.quiet60),
        oneShot: trimList(data.oneShot),
        abandon: trimList(data.abandon),
      },
    });
  } catch (error: any) {
    console.error("마케팅 실행 API 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
