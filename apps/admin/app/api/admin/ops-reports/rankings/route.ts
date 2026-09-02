import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  buildCustomerRankings,
  eachDateInclusive,
  kstToday,
  parseReportDate,
} from "@/lib/ops-daily-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const rawFrom = parseReportDate(request.nextUrl.searchParams.get("from")) ?? kstToday();
  const rawTo = parseReportDate(request.nextUrl.searchParams.get("to")) ?? rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const span = eachDateInclusive(from, to);
  if (span.length === 0) {
    return NextResponse.json({ success: false, error: "날짜 구간이 올바르지 않습니다" }, { status: 400 });
  }
  if (span.length > 93) {
    return NextResponse.json({ success: false, error: "기간은 93일까지입니다" }, { status: 400 });
  }

  try {
    const rankings = await buildCustomerRankings(getSupabaseAdmin(), from, to);
    return NextResponse.json({ success: true, from, to, rankings });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
