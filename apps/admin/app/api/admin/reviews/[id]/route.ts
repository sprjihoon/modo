import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { removeReviewImages } from "@/lib/review-image-storage";

export const dynamic = "force-dynamic";

type ReviewPatch = {
  status?: string;
  is_featured?: boolean;
  display_order?: number;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as ReviewPatch;
    const hasStatus = body.status !== undefined;
    const hasFeatured = typeof body.is_featured === "boolean";
    const hasOrder = typeof body.display_order === "number" && Number.isInteger(body.display_order);

    if (!hasStatus && !hasFeatured && !hasOrder) {
      return NextResponse.json(
        { success: false, error: "변경할 값이 없습니다." },
        { status: 400 }
      );
    }

    if (hasStatus && !["approved", "hidden", "pending"].includes(String(body.status))) {
      return NextResponse.json(
        { success: false, error: "approved, hidden, pending만 가능합니다." },
        { status: 400 }
      );
    }

    const { data: row, error: loadError } = await supabaseAdmin
      .from("reviews")
      .select("id, status, is_featured, display_order")
      .eq("id", id)
      .maybeSingle();

    if (loadError || !row) {
      return NextResponse.json({ success: false, error: "리뷰를 찾을 수 없습니다." }, { status: 404 });
    }

    const nextStatus = hasStatus ? String(body.status) : row.status;
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      moderated_at: new Date().toISOString(),
      moderated_by: auth.user.id,
    };

    if (hasStatus) {
      payload.status = nextStatus;
    }

    if (nextStatus !== "approved") {
      payload.is_featured = false;
      payload.display_order = 0;
    } else if (hasFeatured) {
      if (body.is_featured) {
        payload.is_featured = true;
        if (!row.is_featured) {
          const { data: last } = await supabaseAdmin
            .from("reviews")
            .select("display_order")
            .eq("is_featured", true)
            .order("display_order", { ascending: false })
            .limit(1)
            .maybeSingle();
          payload.display_order = (last?.display_order ?? 0) + 1;
        }
      } else {
        payload.is_featured = false;
        payload.display_order = 0;
      }
    }

    if (hasOrder && nextStatus === "approved") {
      payload.display_order = body.display_order;
    }

    const { error } = await supabaseAdmin.from("reviews").update(payload).eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data: row, error: loadError } = await supabaseAdmin
      .from("reviews")
      .select("id, photo_urls")
      .eq("id", id)
      .maybeSingle();

    if (loadError || !row) {
      return NextResponse.json({ success: false, error: "리뷰를 찾을 수 없습니다." }, { status: 404 });
    }

    await removeReviewImages(supabaseAdmin.storage, row.photo_urls);

    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
