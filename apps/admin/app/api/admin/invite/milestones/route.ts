import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { validateInviteMilestoneBody } from "@/lib/exclusive-coupon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from("invite_coupon_milestones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "초대 쿠폰 조건 조회 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const payload = validateInviteMilestoneBody(body);
    if ("error" in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("invite_coupon_milestones")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "이미 같은 조건의 미션이 있습니다." },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "초대 쿠폰 조건 저장 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
