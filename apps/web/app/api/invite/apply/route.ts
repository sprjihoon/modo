import { NextRequest, NextResponse } from "next/server";
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

/** 로그인 사용자에게 초대코드 적용 (가입 직후 / OAuth 콜백) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!code) {
      return NextResponse.json(
        { ok: false, reason: "empty_code" },
        { status: 400 }
      );
    }

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
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userRow?.id) {
      return NextResponse.json(
        { ok: false, reason: "invitee_not_found" },
        { status: 404 }
      );
    }

    const { data, error } = await admin.rpc("apply_invite_on_signup", {
      p_invitee_user_id: userRow.id,
      p_invite_code: code,
    });

    if (error) {
      console.error("[invite/apply]", error);
      return NextResponse.json(
        { ok: false, reason: "rpc_error", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? { ok: false });
  } catch (e) {
    console.error("[invite/apply]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
