import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "공지사항 조회 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "제목과 내용은 필수입니다" },
        { status: 400 }
      );
    }

    const payload = {
      title,
      content,
      type: String(body.type || "general"),
      send_push: body.send_push !== false,
      target_audience: String(body.target_audience || "all"),
      is_pinned: !!body.is_pinned,
      image_url: body.image_url || null,
      link_url: body.link_url || null,
    };

    if (body.id) {
      const { error } = await supabaseAdmin
        .from("announcements")
        .update({
          ...payload,
          updated_by: auth.user.id,
        })
        .eq("id", body.id);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabaseAdmin.from("announcements").insert({
        ...payload,
        status: "draft",
        created_by: auth.user.id,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "공지사항 저장 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const id = req.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "공지사항 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "공지사항 삭제 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
