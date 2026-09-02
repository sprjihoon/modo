import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { safeRedirectPath } from "@/lib/utils";
import { acqColumns, parseCookieHeader } from "@/lib/acquisition";

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

async function isProfileIncomplete(
  admin: { from: (table: string) => any },
  authId: string
): Promise<boolean> {
  const { data } = await admin
    .from("users")
    .select("name, phone, terms_agreed_at, privacy_agreed_at")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!data) return true;
  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").trim();
  if (!name || name === "고객" || name === "사용자") return true;
  if (!phone) return true;
  if (!data.terms_agreed_at || !data.privacy_agreed_at) return true;
  return false;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "/");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
      let needsCompleteProfile = false;

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

        const { data: userRow } = await admin
          .from("users")
          .select("id")
          .eq("auth_id", data.user.id)
          .maybeSingle();

        if (userRow?.id) {
          const firstAcq = acqColumns(parseCookieHeader(request.headers.get("cookie"))?.first);
          if (firstAcq) {
            try {
              await admin
                .from("users")
                .update(firstAcq)
                .eq("id", userRow.id)
                .is("acq_source", null);
            } catch {
              // acq 컬럼 마이그레이션 전이면 가입은 그대로 진행
            }
          }

          await admin.rpc("grant_signup_reward", {
            p_user_id: userRow.id,
          });

          const inviteCode = readInviteCookie(request);
          if (inviteCode) {
            await admin.rpc("apply_invite_on_signup", {
              p_invitee_user_id: userRow.id,
              p_invite_code: inviteCode,
            });
          }
        }

        needsCompleteProfile = await isProfileIncomplete(admin, data.user.id);
      }

      const destination = needsCompleteProfile
        ? `/complete-profile?redirectTo=${encodeURIComponent(redirectTo)}`
        : redirectTo;

      const res = NextResponse.redirect(`${origin}${destination}`);
      res.cookies.set("modo_invite_code", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
