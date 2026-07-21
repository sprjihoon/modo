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

/** 로그인 사용자에게 회원가입 축하 포인트 지급 (멱등) */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = service();
    const { data: userRow } = await admin
      .from("users")
      .select("id, signup_rewarded_at")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow?.id) {
      return NextResponse.json(
        { ok: false, reason: "user_not_found" },
        { status: 404 }
      );
    }

    if (userRow.signup_rewarded_at) {
      return NextResponse.json({ ok: false, reason: "already_rewarded" });
    }

    const { data, error } = await admin.rpc("grant_signup_reward", {
      p_user_id: userRow.id,
    });

    if (error) {
      console.error("[points/signup-reward]", error);
      return NextResponse.json(
        { ok: false, reason: "rpc_error", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? { ok: false });
  } catch (e) {
    console.error("[points/signup-reward]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
