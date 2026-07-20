import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await Promise.resolve(params);

    const { data, error } = await supabaseAdmin
      .from("popups")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "팝업 조회 실패" },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "팝업 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await Promise.resolve(params);
    const body = await req.json();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.subtitle !== undefined) payload.subtitle = body.subtitle?.trim() || null;
    if (body.title !== undefined) payload.title = body.title.trim();
    if (body.highlight_text !== undefined)
      payload.highlight_text = body.highlight_text?.trim() || null;
    if (body.items !== undefined)
      payload.items = Array.isArray(body.items) ? body.items : [];
    if (body.cta_text !== undefined)
      payload.cta_text = body.cta_text?.trim() || "확인";
    if (body.dismiss_label !== undefined)
      payload.dismiss_label = body.dismiss_label?.trim() || "오늘 하루 보지 않기";
    if (body.dismiss_hours !== undefined)
      payload.dismiss_hours = body.dismiss_hours;
    if (body.is_active !== undefined) payload.is_active = body.is_active;
    if (body.starts_at !== undefined) payload.starts_at = body.starts_at || null;
    if (body.ends_at !== undefined) payload.ends_at = body.ends_at || null;
    if (body.display_priority !== undefined)
      payload.display_priority = body.display_priority;

    const { data, error } = await supabaseAdmin
      .from("popups")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "팝업 수정 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "팝업 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await Promise.resolve(params);

    const { error } = await supabaseAdmin.from("popups").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "팝업 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "팝업 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
