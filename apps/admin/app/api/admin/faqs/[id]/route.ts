import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

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

    if (body.question !== undefined) {
      const question = String(body.question).trim();
      if (!question) {
        return NextResponse.json(
          { success: false, error: "질문은 필수입니다." },
          { status: 400 }
        );
      }
      payload.question = question;
    }
    if (body.answer !== undefined) {
      const answer = String(body.answer).trim();
      if (!answer) {
        return NextResponse.json(
          { success: false, error: "답변은 필수입니다." },
          { status: 400 }
        );
      }
      payload.answer = answer;
    }
    if (body.display_order !== undefined) {
      payload.display_order = body.display_order;
    }
    if (body.is_active !== undefined) {
      payload.is_active = body.is_active;
    }

    const { data, error } = await supabaseAdmin
      .from("faqs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "FAQ 수정 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "FAQ 수정 중 오류가 발생했습니다." },
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

    const { error } = await supabaseAdmin.from("faqs").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "FAQ 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || "FAQ 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
