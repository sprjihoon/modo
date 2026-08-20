import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

const PLATFORMS = ["ios", "android"] as const;

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("app_versions")
    .select(
      "id, platform, latest_version, min_version, store_url, update_message, is_force_update, is_active, updated_at"
    )
    .order("platform");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await req.json();
  const platform = String(body.platform ?? "");
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    return NextResponse.json({ error: "platform은 ios 또는 android여야 합니다" }, { status: 400 });
  }

  const latest = String(body.latest_version ?? "").trim();
  const min = String(body.min_version ?? "").trim();
  const storeUrl = String(body.store_url ?? "").trim();
  if (!latest || !min || !storeUrl) {
    return NextResponse.json(
      { error: "최신 버전, 최소 버전, 스토어 URL은 필수입니다" },
      { status: 400 }
    );
  }

  const payload = {
    platform,
    latest_version: latest,
    min_version: min,
    store_url: storeUrl,
    update_message:
      String(body.update_message ?? "").trim() ||
      "새로운 기능이 추가되었습니다. 업데이트해 주세요!",
    is_force_update: Boolean(body.is_force_update),
    is_active: body.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("app_versions")
    .upsert(payload, { onConflict: "platform" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
