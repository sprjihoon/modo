import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("invite_settings")
      .select("invite_reward_amount, is_active, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[admin invite/settings GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      invite_reward_amount: data?.invite_reward_amount ?? 1000,
      is_active: data?.is_active ?? true,
      updated_at: data?.updated_at ?? null,
    });
  } catch (e) {
    console.error("[admin invite/settings GET]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const amount = Number(body?.invite_reward_amount);
    const isActive =
      typeof body?.is_active === "boolean" ? body.is_active : undefined;

    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "적립 금액은 0 이상의 정수여야 합니다." },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      invite_reward_amount: amount,
      updated_at: new Date().toISOString(),
    };
    if (isActive !== undefined) patch.is_active = isActive;

    const { data, error } = await supabase
      .from("invite_settings")
      .upsert({ id: 1, ...patch }, { onConflict: "id" })
      .select("invite_reward_amount, is_active, updated_at")
      .single();

    if (error) {
      console.error("[admin invite/settings PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[admin invite/settings PATCH]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
