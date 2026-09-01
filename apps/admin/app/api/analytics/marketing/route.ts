import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { buildMarketingInsights } from "@/lib/marketing-insights";

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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const start = startDate ? `${startDate}T00:00:00+09:00` : undefined;
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

    const data = buildMarketingInsights({
      startDate,
      endDate,
      orders,
      users,
      events: events.map((event) => ({
        ...event,
        metadata:
          event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
            ? (event.metadata as Record<string, unknown>)
            : null,
      })),
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("마케팅 인사이트 API 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
