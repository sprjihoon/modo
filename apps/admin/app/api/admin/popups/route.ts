import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const activeOnly = req.nextUrl.searchParams.get("active_only") === "true";

    let query = supabaseAdmin
      .from("popups")
      .select("*")
      .order("display_priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      const isTableNotFound =
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("not found");

      return NextResponse.json(
        {
          success: false,
          error: isTableNotFound
            ? "popups 테이블이 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_popups_table.sql"
            : error.message || "팝업 조회 실패",
          details: error.details || error.message,
          code: error.code,
          hint: isTableNotFound
            ? "Run migration: create_popups_table.sql"
            : error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "팝업 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "제목은 필수입니다." },
        { status: 400 }
      );
    }

    const payload = {
      subtitle: body.subtitle?.trim() || null,
      title: body.title.trim(),
      highlight_text: body.highlight_text?.trim() || null,
      items: Array.isArray(body.items) ? body.items : [],
      cta_text: body.cta_text?.trim() || "확인",
      dismiss_label: body.dismiss_label?.trim() || "오늘 그만보기",
      dismiss_hours:
        typeof body.dismiss_hours === "number" ? body.dismiss_hours : 24,
      is_active: body.is_active ?? false,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      display_priority: body.display_priority ?? 0,
    };

    const { data, error } = await supabaseAdmin
      .from("popups")
      .insert(payload)
      .select()
      .single();

    if (error) {
      const isTableNotFound =
        error.code === "PGRST205" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("not found");

      return NextResponse.json(
        {
          success: false,
          error: isTableNotFound
            ? "popups 테이블이 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_popups_table.sql"
            : error.message || "팝업 생성 실패",
          details: error.details || error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "팝업 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
