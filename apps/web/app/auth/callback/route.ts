import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // OAuth 신규 유저를 public.users에 upsert (카카오/구글/애플 등)
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
      }

      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
