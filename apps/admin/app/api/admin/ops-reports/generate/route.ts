import { NextRequest, NextResponse } from "next/server";
import { isVercelCronRequest } from "@/lib/admin-host";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isDeliverableEmail } from "@/lib/order-email";
import {
  addKstDays,
  buildOpsDailyMetrics,
  eachDateInclusive,
  kstToday,
  kstYesterday,
  normalizeOpsReportSettings,
  parseReportDate,
  reportEmailRecipients,
  sendOpsReportEmail,
  sentOnKstDate,
  shouldSendOpsReportNow,
} from "@/lib/ops-daily-report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorize(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) {
    return { ok: true as const, via: "cron" as const };
  }
  if (isVercelCronRequest(request.headers)) {
    return { ok: true as const, via: "cron" as const };
  }
  const auth = await requireAdmin();
  if (auth.response) return { ok: false as const, response: auth.response };
  return { ok: true as const, via: "admin" as const, userId: auth.user.id };
}

async function upsertReport(
  reportDate: string,
  generatedBy: string,
  sendEmail: boolean,
  extraTo: string[] = []
) {
  const admin = getSupabaseAdmin();
  const metrics = await buildOpsDailyMetrics(admin, reportDate);
  let emailSentAt: string | null = null;
  let emailError: string | null = null;

  if (sendEmail) {
    const to = [...new Set([...reportEmailRecipients(), ...extraTo])];
    const result = await sendOpsReportEmail({ to, reportDate, metrics });
    if (result.sent) emailSentAt = new Date().toISOString();
    else emailError = result.error ?? "발송 실패";
  }

  const { data, error } = await admin
    .from("ops_daily_reports" as never)
    .upsert(
      {
        report_date: reportDate,
        generated_at: new Date().toISOString(),
        metrics,
        email_sent_at: emailSentAt,
        email_error: emailError,
        generated_by: generatedBy,
      } as never,
      { onConflict: "report_date" }
    )
    .select("report_date, generated_at, metrics, email_sent_at, email_error, generated_by")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function loadSchedule() {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("ops_report_settings")
    .select("enabled, send_hour, send_minute")
    .eq("id", 1)
    .maybeSingle();
  return normalizeOpsReportSettings(data);
}

export async function GET(request: NextRequest) {
  const settings = await loadSchedule();
  if (!shouldSendOpsReportNow(settings)) {
    console.info("[ops-report-cron] skip not-send-time", {
      host: request.headers.get("host"),
      schedule: settings,
    });
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "not-send-time",
      schedule: settings,
    });
  }

  const reportDate = kstYesterday();
  const { data: existing } = await getSupabaseAdmin()
    .from("ops_daily_reports")
    .select("email_sent_at")
    .eq("report_date", reportDate)
    .maybeSingle();
  if (sentOnKstDate(existing?.email_sent_at, kstToday())) {
    console.info("[ops-report-cron] skip already-sent", { reportDate });
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "already-sent",
      schedule: settings,
    });
  }

  console.info("[ops-report-cron] send", {
    host: request.headers.get("host"),
    reportDate,
  });
  // 설정한 KST 시각(기본 09:00)에 전날을 다시 집계한 뒤 메일 발송
  return generate(request, {
    date: reportDate,
    backfillDays: 30,
    sendEmail: true,
  });
}

export async function POST(request: NextRequest) {
  let body: {
    date?: string;
    from?: string;
    to?: string;
    backfillDays?: number;
    sendEmail?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const from = parseReportDate(body.from ?? null);
  const to = parseReportDate(body.to ?? null);
  return generate(request, {
    date: parseReportDate(body.date ?? null) ?? to ?? kstToday(),
    from,
    to,
    backfillDays: Math.min(60, Math.max(0, Number(body.backfillDays) || 0)),
    sendEmail: body.sendEmail === true,
  });
}

async function generate(
  request: NextRequest,
  options: {
    date: string;
    from?: string | null;
    to?: string | null;
    backfillDays: number;
    sendEmail: boolean;
  }
) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  const today = kstToday();
  if (options.date > today) {
    return NextResponse.json({ success: false, error: "미래 날짜는 만들 수 없습니다" }, { status: 400 });
  }

  try {
    const generatedBy = auth.via === "cron" ? "cron" : auth.userId;
    const extraTo: string[] = [];
    if (auth.via === "admin" && options.sendEmail) {
      const { data: me } = await getSupabaseAdmin()
        .from("users")
        .select("email")
        .eq("id", auth.userId)
        .maybeSingle();
      if (isDeliverableEmail(me?.email)) extraTo.push(me!.email.trim());
    }
    const dates = new Set<string>([options.date]);
    if (options.from && options.to) {
      for (const day of eachDateInclusive(options.from, options.to > today ? today : options.to)) {
        dates.add(day);
      }
    }
    for (let i = 0; i < options.backfillDays; i++) {
      dates.add(addKstDays(today, -i));
    }
    if (dates.size > 93) {
      return NextResponse.json(
        { success: false, error: "한 번에 채울 수 있는 기간은 93일입니다. 기간을 나눠 주세요." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const existing = new Set<string>();
    if (options.backfillDays > 0) {
      const { data } = await admin
        .from("ops_daily_reports" as never)
        .select("report_date")
        .gte("report_date", addKstDays(today, -options.backfillDays));
      for (const row of data ?? []) {
        existing.add((row as { report_date: string }).report_date);
      }
    }

    const created: string[] = [];
    let report = null;
    for (const date of [...dates].sort()) {
      const mustRefresh = date === options.date;
      if (!mustRefresh && existing.has(date)) continue;
      const sendEmail = options.sendEmail && date === options.date;
      const saved = await upsertReport(date, generatedBy, sendEmail, extraTo);
      created.push(date);
      if (date === options.date) report = saved;
    }

    return NextResponse.json({ success: true, report, created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
