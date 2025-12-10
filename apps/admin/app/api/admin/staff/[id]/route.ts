import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Supabase Admin Client (Service Role Key 사용)
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
 * GET /api/admin/staff/[id]
 * 직원 정보 조회
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, auth_id, email, name, phone, role, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("❌ 직원 정보 조회 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/staff/[id]
 * 직원 정보 수정
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, phone, role, password } = body;

    // 입력 검증
    if (!name || !phone || !role) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 역할 검증
    if (role !== "MANAGER" && role !== "WORKER") {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    // 1. 기존 사용자 조회
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("auth_id, email, phone, role")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ADMIN 계정은 수정 불가
    if (existingUser.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "관리자 계정은 수정할 수 없습니다." },
        { status: 403 }
      );
    }

    // 전화번호가 변경된 경우 중복 체크
    if (phone !== existingUser.phone) {
      const { data: phoneCheck } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", phone)
        .neq("id", id)
        .maybeSingle();

      if (phoneCheck) {
        return NextResponse.json(
          { success: false, error: "이미 사용 중인 전화번호입니다." },
          { status: 400 }
        );
      }
    }

    console.log("📝 직원 정보 수정 시작:", existingUser.email);

    // 2. users 테이블 업데이트
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        name,
        phone,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ 사용자 정보 수정 실패:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // 3. 비밀번호 변경 요청이 있는 경우
    if (password && password.length >= 6) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.auth_id,
        { password }
      );

      if (passwordError) {
        console.error("⚠️ 비밀번호 변경 실패:", passwordError);
        // 비밀번호 변경 실패해도 다른 정보는 업데이트됨
      } else {
        console.log("✅ 비밀번호 변경 완료");
      }
    }

    console.log("✅ 직원 정보 수정 완료:", updatedUser);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "직원 정보가 수정되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 직원 정보 수정 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/staff/[id]
 * 직원 계정 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. users 테이블에서 auth_id 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("auth_id, email, role")
      .eq("id", id)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // ADMIN 계정은 삭제 불가
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "관리자 계정은 삭제할 수 없습니다." },
        { status: 403 }
      );
    }

    console.log("🗑️ 직원 계정 삭제 시작:", user.email);

    // 2. Auth 계정 삭제 (Cascade로 users 테이블도 삭제됨)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);

    if (deleteError) {
      console.error("❌ Auth 계정 삭제 실패:", deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    console.log("✅ 직원 계정 삭제 완료:", user.email);

    return NextResponse.json({
      success: true,
      message: "직원 계정이 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 직원 계정 삭제 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

