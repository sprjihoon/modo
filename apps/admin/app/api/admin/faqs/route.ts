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
      .from("faqs")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

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
            ? "faqs 테이블이 없습니다. 마이그레이션을 실행해주세요: apps/sql/migrations/create_faqs_table.sql"
            : error.message || "FAQ 조회 실패",
          details: error.details || error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "FAQ 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json();
    const question = String(body.question ?? "").trim();
    const answer = String(body.answer ?? "").trim();

    if (!question) {
      return NextResponse.json(
        { success: false, error: "질문은 필수입니다." },
        { status: 400 }
      );
    }
    if (!answer) {
      return NextResponse.json(
        { success: false, error: "답변은 필수입니다." },
        { status: 400 }
      );
    }

    let displayOrder = body.display_order;
    if (typeof displayOrder !== "number") {
      const { data: last } = await supabaseAdmin
        .from("faqs")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      displayOrder = (last?.display_order ?? 0) + 1;
    }

    const payload = {
      question,
      answer,
      display_order: displayOrder,
      is_active: body.is_active ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from("faqs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "FAQ 생성 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "FAQ 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
