import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function readInviteCookie(request: Request): string {
  const raw = request.headers.get("cookie") || "";
  const match = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("modo_invite_code="));
  if (!match) return "";
  try {
    return decodeURIComponent(match.split("=")[1] || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (srk) {
        const admin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          srk
        );
        const meta = data.user.user_metadata || {};
        const appMeta = data.user.app_metadata || {};
        const email =
          data.user.email ||
          meta.email ||
          `oauth_${data.user.id}@noemail.local`;
        const name =
          meta.full_name || meta.name || meta.nickname || "고객";
        const provider = appMeta.provider || "email";

        await admin.from("users").upsert(
          {
            auth_id: data.user.id,
            email,
            name,
            phone: null,
            role: "CUSTOMER",
            login_provider: provider,
          },
          { onConflict: "auth_id", ignoreDuplicates: true }
        );

        const inviteCode = readInviteCookie(request);
        if (inviteCode) {
          const { data: userRow } = await admin
            .from("users")
            .select("id")
            .eq("auth_id", data.user.id)
            .maybeSingle();
          if (userRow?.id) {
            await admin.rpc("apply_invite_on_signup", {
              p_invitee_user_id: userRow.id,
              p_invite_code: inviteCode,
            });
          }
        }
      }

      const res = NextResponse.redirect(`${origin}${redirectTo}`);
      // 적용 시도 후 쿠키 정리
      res.cookies.set("modo_invite_code", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
