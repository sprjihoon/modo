import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** 내 초대 코드·현황 (없으면 코드 발급) */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = service();
    const { data: userRow, error } = await admin
      .from("users")
      .select(
        "id, invite_code, invite_count, invite_points_earned, invited_by, invite_rewarded_at"
      )
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error || !userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let inviteCode = userRow.invite_code as string | null;
    if (!inviteCode) {
      const { data: code, error: codeErr } = await admin.rpc(
        "ensure_user_invite_code",
        { p_user_id: userRow.id }
      );
      if (codeErr) {
        console.error("[invite/me] ensure code", codeErr);
        return NextResponse.json(
          { error: "Failed to create invite code" },
          { status: 500 }
        );
      }
      inviteCode = code as string;
    }

    const { data: settings } = await admin
      .from("invite_settings")
      .select("invite_reward_amount, invitee_reward_amount, is_active")
      .eq("id", 1)
      .maybeSingle();

    const canApplyInvite =
      !userRow.invited_by && !userRow.invite_rewarded_at;

    return NextResponse.json({
      invite_code: inviteCode,
      invite_count: userRow.invite_count ?? 0,
      invite_points_earned: userRow.invite_points_earned ?? 0,
      reward_amount: settings?.invite_reward_amount ?? 1000,
      invitee_reward_amount: settings?.invitee_reward_amount ?? 1000,
      reward_active: settings?.is_active ?? true,
      can_apply_invite: canApplyInvite,
    });
  } catch (e) {
    console.error("[invite/me]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
