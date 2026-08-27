import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
    }

    const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("id, email")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    if (profile) {
      const userIdShort = String(profile.id).replace(/-/g, "").substring(0, 16);
      const { error: anonymizeError } = await admin
        .from("users")
        .update({
          email: `deleted_${userIdShort}@deleted.modorepair.com`,
          name: "탈퇴한 사용자",
          phone: `0100000${userIdShort.substring(0, 4)}`,
          default_address: null,
          default_address_detail: null,
          default_zipcode: null,
          fcm_token: null,
        })
        .eq("id", profile.id);

      if (anonymizeError) {
        return NextResponse.json({ error: "탈퇴 처리에 실패했습니다." }, { status: 500 });
      }

      await admin.from("addresses").delete().eq("user_id", profile.id);
      await admin.from("notifications").delete().eq("user_id", profile.id);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json({ error: "탈퇴 처리에 실패했습니다." }, { status: 500 });
    }

    if (profile) {
      await admin.from("users").update({ auth_id: null }).eq("id", profile.id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
