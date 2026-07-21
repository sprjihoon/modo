import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** 고객용: 현재 초대 적립 금액 조회 */
export async function GET() {
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from("invite_settings")
      .select("invite_reward_amount, invitee_reward_amount, is_active")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[invite/settings]", error);
      return NextResponse.json(
        {
          invite_reward_amount: 1000,
          invitee_reward_amount: 1000,
          is_active: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      invite_reward_amount: data?.invite_reward_amount ?? 1000,
      invitee_reward_amount: data?.invitee_reward_amount ?? 1000,
      is_active: data?.is_active ?? true,
    });
  } catch (e) {
    console.error("[invite/settings]", e);
    return NextResponse.json(
      {
        invite_reward_amount: 1000,
        invitee_reward_amount: 1000,
        is_active: true,
      },
      { status: 200 }
    );
  }
}
