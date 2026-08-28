import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ops-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  DEFAULT_OPS_REPORT_SETTINGS,
  normalizeOpsReportSettings,
  parseOpsReportTime,
} from "@/lib/ops-daily-report";

export const dynamic = "force-dynamic";

async function readSettings() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ops_report_settings")
    .select("enabled, send_hour, send_minute, updated_at, updated_by")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return {
      ...DEFAULT_OPS_REPORT_SETTINGS,
      updated_at: null as string | null,
      updated_by: null as string | null,
      error: error.message,
    };
  }
  const settings = normalizeOpsReportSettings(data);
  return {
    ...settings,
    updated_at: data?.updated_at ?? null,
    updated_by: data?.updated_by ?? null,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return NextResponse.json({ success: true, settings: await readSettings() });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let body: { enabled?: boolean; time?: string; sendHour?: number; sendMinute?: number } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청" }, { status: 400 });
  }

  const current = await readSettings();
  let sendHour = current.sendHour;
  let sendMinute = current.sendMinute;
  let enabled = current.enabled;

  if (typeof body.time === "string") {
    const parsed = parseOpsReportTime(body.time);
    if (!parsed) {
      return NextResponse.json({ success: false, error: "시각은 HH:MM 형식이어야 합니다" }, { status: 400 });
    }
    sendHour = parsed.hour;
    sendMinute = parsed.minute;
  }
  if (body.sendHour !== undefined) {
    const hour = Number(body.sendHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return NextResponse.json({ success: false, error: "시는 0–23이어야 합니다" }, { status: 400 });
    }
    sendHour = hour;
  }
  if (body.sendMinute !== undefined) {
    const minute = Number(body.sendMinute);
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      return NextResponse.json({ success: false, error: "분은 0–59여야 합니다" }, { status: 400 });
    }
    sendMinute = minute;
  }
  if (typeof body.enabled === "boolean") {
    enabled = body.enabled;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ops_report_settings")
    .upsert(
      {
        id: 1,
        enabled,
        send_hour: sendHour,
        send_minute: sendMinute,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      },
      { onConflict: "id" }
    )
    .select("enabled, send_hour, send_minute, updated_at, updated_by")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: `설정을 저장하지 못했습니다. SQL을 먼저 적용해 주세요. (${error.message})` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    settings: {
      ...normalizeOpsReportSettings(data),
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    },
  });
}
