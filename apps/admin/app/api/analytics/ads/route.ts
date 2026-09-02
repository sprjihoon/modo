import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireStaff } from "@/lib/ops-auth";
import { addDaysYmd } from "@/lib/marketing-insights";
import { buildAdPerformance, type AdEvent, type AdOrder, type AdSpendRow, type AdUser } from "@/lib/ad-performance";

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

function asMeta(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const today = addDaysYmd(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10), 0);
    const startDate = searchParams.get("startDate") || addDaysYmd(today, -30);
    const endDate = searchParams.get("endDate") || today;

    const userSelectWithAcq = "id, created_at, email, acq_source, acq_medium, acq_campaign, acq_content, acq_term";
    const orderSelectWithAcq =
      "user_id, paid_at, created_at, total_price, payment_status, status, acq_source, acq_medium, acq_campaign, acq_content, acq_term";

    let users: AdUser[] = [];
    const usersFull = await fetchAll<AdUser>(async (from, to) =>
      supabaseAdmin.from("users").select(userSelectWithAcq).eq("role", "CUSTOMER").order("created_at", { ascending: false }).range(from, to)
    ).catch(async (error: Error) => {
      if (!/acq_source|column/i.test(error.message)) throw error;
      return fetchAll<AdUser>(async (from, to) =>
        supabaseAdmin.from("users").select("id, created_at, email").eq("role", "CUSTOMER").order("created_at", { ascending: false }).range(from, to)
      );
    });
    users = usersFull;

    let orders: AdOrder[] = [];
    orders = await fetchAll<AdOrder>(async (from, to) =>
      supabaseAdmin.from("orders").select(orderSelectWithAcq).order("created_at", { ascending: false }).range(from, to)
    ).catch(async (error: Error) => {
      if (!/acq_source|column/i.test(error.message)) throw error;
      return fetchAll<AdOrder>(async (from, to) =>
        supabaseAdmin
          .from("orders")
          .select("user_id, paid_at, created_at, total_price, payment_status, status")
          .order("created_at", { ascending: false })
          .range(from, to)
      );
    });

    const events = (
      await fetchAll<AdEvent>(async (from, to) =>
        supabaseAdmin
          .from("customer_events")
          .select("created_at, user_id, referrer, page_url, metadata, device_os, app_version")
          .not("user_id", "is", null)
          .order("created_at", { ascending: true })
          .range(from, to)
      )
    ).map((event) => ({ ...event, metadata: asMeta(event.metadata) }));

    let spends: AdSpendRow[] = [];
    let spendError: string | null = null;
    const spendRes = await supabaseAdmin
      .from("ad_spend")
      .select("id, source, campaign, start_date, end_date, amount, note")
      .order("start_date", { ascending: false });
    if (spendRes.error) {
      spendError = /ad_spend|schema cache|not find/i.test(spendRes.error.message)
        ? "ad_spend 테이블이 없습니다. 마이그레이션을 실행하세요."
        : spendRes.error.message;
    } else {
      spends = (spendRes.data || []) as AdSpendRow[];
    }

    const data = buildAdPerformance({ startDate, endDate, users, orders, events, spends });
    return NextResponse.json({ success: true, data, spendError });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("광고 성과 API 오류:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
