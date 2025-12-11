import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * PUT /api/admin/my-account/password
 * 비밀번호 변경
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: "새 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 최소 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 쿠키에서 이메일 가져오기
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('admin-email')?.value;

    if (!emailFromCookie) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // staff 테이블에서 auth_id 조회
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("auth_id, email")
      .eq("email", emailFromCookie)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError || !staff) {
      // users 테이블에서 시도 (레거시)
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("auth_id, email")
        .eq("email", emailFromCookie)
        .maybeSingle();

      if (!user) {
        return NextResponse.json(
          { success: false, error: "사용자를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 비밀번호 변경
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.auth_id,
        { password: newPassword }
      );

      if (passwordError) {
        console.error("❌ 비밀번호 변경 실패:", passwordError);
        return NextResponse.json(
          { success: false, error: passwordError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "비밀번호가 변경되었습니다.",
      });
    }

    if (!staff.auth_id) {
      return NextResponse.json(
        { success: false, error: "인증 정보를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // 비밀번호 변경
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      staff.auth_id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("❌ 비밀번호 변경 실패:", passwordError);
      return NextResponse.json(
        { success: false, error: passwordError.message },
        { status: 500 }
      );
    }

    console.log("✅ 비밀번호 변경 완료:", staff.email);

    return NextResponse.json({
      success: true,
      message: "비밀번호가 변경되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 비밀번호 변경 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

