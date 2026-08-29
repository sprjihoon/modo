import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("review_settings")
      .select("text_review_points, photo_review_points, is_active, min_content_length, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      text_review_points: data?.text_review_points ?? 200,
      photo_review_points: data?.photo_review_points ?? 500,
      is_active: data?.is_active ?? true,
      min_content_length: data?.min_content_length ?? 10,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "조회 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const patch: {
      updated_at: string;
      text_review_points?: number;
      photo_review_points?: number;
      is_active?: boolean;
      min_content_length?: number;
    } = { updated_at: new Date().toISOString() };

    if (body.text_review_points !== undefined) {
      const n = Number(body.text_review_points);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ success: false, error: "글 리뷰 포인트는 0 이상 정수여야 합니다." }, { status: 400 });
      }
      patch.text_review_points = n;
    }
    if (body.photo_review_points !== undefined) {
      const n = Number(body.photo_review_points);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ success: false, error: "포토 리뷰 포인트는 0 이상 정수여야 합니다." }, { status: 400 });
      }
      patch.photo_review_points = n;
    }
    if (typeof body.is_active === "boolean") {
      patch.is_active = body.is_active;
    }
    if (body.min_content_length !== undefined) {
      const n = Number(body.min_content_length);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json({ success: false, error: "최소 글자 수는 1 이상이어야 합니다." }, { status: 400 });
      }
      patch.min_content_length = n;
    }

    const { error } = await supabaseAdmin
      .from("review_settings")
      .update(patch)
      .eq("id", 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "저장 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
