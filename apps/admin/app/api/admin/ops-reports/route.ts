import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  addKstDays,
  eachDateInclusive,
  kstToday,
  parseReportDate,
  type OpsDailyMetrics,
} from "@/lib/ops-daily-report";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const date = parseReportDate(request.nextUrl.searchParams.get("date"));
  const rawFrom =
    parseReportDate(request.nextUrl.searchParams.get("from")) ?? addKstDays(kstToday(), -29);
  const rawTo = parseReportDate(request.nextUrl.searchParams.get("to")) ?? kstToday();
  const requestedFrom = rawFrom <= rawTo ? rawFrom : rawTo;
  const requestedTo = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = eachDateInclusive(requestedFrom, requestedTo);
  const from = span[0] ?? requestedFrom;
  const to = span[span.length - 1] ?? requestedTo;

  const admin = getSupabaseAdmin();

  if (date) {
    const { data, error } = await admin
      .from("ops_daily_reports" as never)
      .select("report_date, generated_at, metrics, email_sent_at, email_error, generated_by")
      .eq("report_date", date)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, report: data });
  }

  const { data, error } = await admin
    .from("ops_daily_reports" as never)
    .select("report_date, generated_at, metrics, email_sent_at, email_error, generated_by")
    .gte("report_date", from)
    .lte("report_date", to)
    .order("report_date", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    from,
    to,
    reports: (data ?? []) as Array<{
      report_date: string;
      generated_at: string;
      metrics: OpsDailyMetrics;
      email_sent_at: string | null;
      email_error: string | null;
      generated_by: string | null;
    }>,
  });
}
