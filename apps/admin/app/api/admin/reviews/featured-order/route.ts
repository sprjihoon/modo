import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? (body.ids as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "순서를 지정할 리뷰가 없습니다." }, { status: 400 });
    }

    const { data: rows, error: loadError } = await supabaseAdmin
      .from("reviews")
      .select("id, status")
      .in("id", ids);

    if (loadError) {
      return NextResponse.json({ success: false, error: loadError.message }, { status: 500 });
    }

    const found = new Set((rows ?? []).map((row) => row.id));
    if (found.size !== ids.length) {
      return NextResponse.json({ success: false, error: "일부 리뷰를 찾을 수 없습니다." }, { status: 404 });
    }
    if ((rows ?? []).some((row) => row.status !== "approved")) {
      return NextResponse.json(
        { success: false, error: "공개된 리뷰만 홈에 올릴 수 있습니다." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const results = await Promise.all(
      ids.map((id, index) =>
        supabaseAdmin
          .from("reviews")
          .update({
            is_featured: true,
            display_order: index + 1,
            updated_at: now,
            moderated_at: now,
            moderated_by: auth.user.id,
          })
          .eq("id", id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json({ success: false, error: failed.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "순서 저장 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
