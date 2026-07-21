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
      .select(
        "invite_reward_amount, invitee_reward_amount, is_active, signup_reward_amount, signup_reward_active, updated_at"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[admin invite/settings GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      invite_reward_amount: data?.invite_reward_amount ?? 1000,
      invitee_reward_amount: data?.invitee_reward_amount ?? 1000,
      is_active: data?.is_active ?? true,
      signup_reward_amount: data?.signup_reward_amount ?? 1000,
      signup_reward_active: data?.signup_reward_active ?? true,
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
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body?.invite_reward_amount !== undefined) {
      const amount = Number(body.invite_reward_amount);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
        return NextResponse.json(
          { error: "초대자 적립 금액은 0 이상의 정수여야 합니다." },
          { status: 400 }
        );
      }
      patch.invite_reward_amount = amount;
    }

    if (body?.invitee_reward_amount !== undefined) {
      const amount = Number(body.invitee_reward_amount);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
        return NextResponse.json(
          { error: "피초대자 적립 금액은 0 이상의 정수여야 합니다." },
          { status: 400 }
        );
      }
      patch.invitee_reward_amount = amount;
    }

    if (typeof body?.is_active === "boolean") {
      patch.is_active = body.is_active;
    }

    if (body?.signup_reward_amount !== undefined) {
      const amount = Number(body.signup_reward_amount);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
        return NextResponse.json(
          { error: "가입 적립 금액은 0 이상의 정수여야 합니다." },
          { status: 400 }
        );
      }
      patch.signup_reward_amount = amount;
    }

    if (typeof body?.signup_reward_active === "boolean") {
      patch.signup_reward_active = body.signup_reward_active;
    }

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json(
        { error: "변경할 값이 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("invite_settings")
      .upsert({ id: 1, ...patch }, { onConflict: "id" })
      .select(
        "invite_reward_amount, invitee_reward_amount, is_active, signup_reward_amount, signup_reward_active, updated_at"
      )
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
