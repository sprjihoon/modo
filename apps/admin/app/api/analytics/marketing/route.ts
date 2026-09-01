import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import {
  buildMarketingInsights,
  compareTotals,
  inKstRange,
  isPaidOrder,
  previousPeriod,
} from "@/lib/marketing-insights";

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

function uniquePayers(orders: Array<{ user_id?: string | null; payment_status?: string | null; paid_at?: string | null; status?: string | null }>) {
  const ids = new Set<string>();
  for (const order of orders) {
    if (order.user_id && isPaidOrder(order)) ids.add(order.user_id);
  }
  return ids.size;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const previous = startDate && endDate ? previousPeriod(startDate, endDate) : null;
    const queryStart = previous?.start ?? startDate;
    const start = queryStart ? `${queryStart}T00:00:00+09:00` : undefined;
    const end = endDate ? `${endDate}T23:59:59+09:00` : undefined;

    const [orders, users, events] = await Promise.all([
      fetchAll(async (from, to) => {
        let query = supabaseAdmin
          .from("orders")
          .select("paid_at, created_at, total_price, payment_status, status, clothing_type, repair_type, order_source, user_id")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (start) query = query.gte("created_at", start);
        if (end) query = query.lte("created_at", end);
        return query;
      }),
      fetchAll(async (from, to) => {
        let query = supabaseAdmin
          .from("users")
          .select("created_at")
          .eq("role", "CUSTOMER")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (start) query = query.gte("created_at", start);
        if (end) query = query.lte("created_at", end);
        return query;
      }),
      fetchAll(async (from, to) => {
        let query = supabaseAdmin
          .from("customer_events")
          .select("created_at, user_id, event_type, referrer, page_url, metadata, device_os, app_version, session_id")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (start) query = query.gte("created_at", start);
        if (end) query = query.lte("created_at", end);
        return query;
      }),
    ]);

    const normalizeEvents = (rows: typeof events) =>
      rows.map((event) => ({
        ...event,
        metadata:
          event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : null,
      }));

    const filterPeriod = (rangeStart: string, rangeEnd: string) => ({
      orders: orders.filter((order) => inKstRange(order.paid_at || order.created_at, rangeStart, rangeEnd)),
      users: users.filter((user) => inKstRange(user.created_at, rangeStart, rangeEnd)),
      events: normalizeEvents(events.filter((event) => inKstRange(event.created_at, rangeStart, rangeEnd))),
    });

    const currentInput = startDate && endDate ? filterPeriod(startDate, endDate) : {
      orders,
      users,
      events: normalizeEvents(events),
    };

    const data = buildMarketingInsights({
      startDate,
      endDate,
      ...currentInput,
    });

    if (startDate && endDate && previous) {
      const prevInput = filterPeriod(previous.start, previous.end);
      const prevData = buildMarketingInsights({
        startDate: previous.start,
        endDate: previous.end,
        ...prevInput,
      });
      data.compare = compareTotals(
        {
          startDate,
          endDate,
          signups: data.totals.signups,
          payers: uniquePayers(currentInput.orders),
          payments: data.totals.paidOrders,
          amount: data.totals.paidAmount,
          visitors: data.totals.visitors,
        },
        {
          startDate: previous.start,
          endDate: previous.end,
          signups: prevData.totals.signups,
          payers: uniquePayers(prevInput.orders),
          payments: prevData.totals.paidOrders,
          amount: prevData.totals.paidAmount,
          visitors: prevData.totals.visitors,
        }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("마케팅 인사이트 API 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
