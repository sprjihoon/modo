import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";
import { validateExclusiveIssueBody } from "@/lib/exclusive-coupon";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("promotion_codes")
      .select("*")
      .eq("assigned_user_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "쿠폰 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const payload = validateExclusiveIssueBody(body);
    if ("error" in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: "고객을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data, error } = await (supabaseAdmin as any).rpc("issue_exclusive_promotion_code", {
      p_user_id: id,
      p_source: "cs",
      p_discount_type: payload.discount_type,
      p_discount_value: payload.discount_value,
      p_valid_days: payload.valid_days,
      p_min_order_amount: payload.min_order_amount,
      p_max_discount_amount: payload.max_discount_amount,
      p_issued_by: auth.user.id,
      p_issued_note: payload.issued_note,
      p_milestone_threshold: null,
      p_description: payload.issued_note || "CS 전용 쿠폰",
      p_valid_until: payload.valid_until,
      p_includes_free_shipping: payload.includes_free_shipping,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "쿠폰 발급에 실패했습니다." },
        { status: 500 }
      );
    }

    const result = data as { ok?: boolean; code?: string; id?: string; error?: string } | null;
    if (!result?.ok) {
      const reason =
        result?.error === "already_issued"
          ? "이미 같은 조건의 쿠폰이 있습니다."
          : result?.error || "쿠폰 발급에 실패했습니다.";
      return NextResponse.json({ success: false, error: reason }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { id: result.id, code: result.code, customerName: user.name },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "쿠폰 발급 중 오류가 발생했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
