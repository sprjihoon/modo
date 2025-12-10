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
 * GET /api/admin/staff
 * 전체 직원 목록 조회 (ADMIN만 접근 가능)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role"); // 역할 필터링 옵션

    // 직원 목록 조회 (MANAGER, WORKER만, ADMIN 제외)
    let query = supabaseAdmin
      .from("users")
      .select("id, auth_id, email, name, phone, role, created_at, updated_at")
      .in("role", ["MANAGER", "WORKER"])
      .order("created_at", { ascending: false });

    // 역할 필터링
    if (roleFilter && (roleFilter === "MANAGER" || roleFilter === "WORKER")) {
      query = query.eq("role", roleFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ 직원 목록 조회 실패:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error("❌ 직원 목록 조회 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/staff
 * 직원 계정 생성 (ADMIN만 접근 가능)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role } = body;

    // 입력 검증
    if (!email || !password || !name || !phone || !role) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 역할 검증 (MANAGER 또는 WORKER만 생성 가능)
    if (role !== "MANAGER" && role !== "WORKER") {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 역할입니다. MANAGER 또는 WORKER만 생성 가능합니다." },
        { status: 400 }
      );
    }

    // 이메일 중복 체크
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    // 전화번호 중복 체크
    const { data: existingPhone } = await supabaseAdmin
      .from("users")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 전화번호입니다." },
        { status: 400 }
      );
    }

    console.log("📝 직원 계정 생성 시작:", { email, name, role });

    // 1. Supabase Auth에 사용자 생성 (이메일 확인 없이)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 확인 없이 즉시 활성화
      user_metadata: {
        name,
        phone,
      },
    });

    if (authError || !authData.user) {
      console.error("❌ Auth 계정 생성 실패:", authError);
      return NextResponse.json(
        { success: false, error: authError?.message || "Auth 계정 생성 실패" },
        { status: 500 }
      );
    }

    console.log("✅ Auth 계정 생성 완료:", authData.user.id);

    // 2. users 테이블에 프로필 생성
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email,
        name,
        phone,
        role,
      })
      .select()
      .single();

    if (userError) {
      console.error("❌ 사용자 프로필 생성 실패:", userError);
      // Auth 계정은 생성되었지만 프로필 생성 실패 - Auth 계정 삭제
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: userError.message },
        { status: 500 }
      );
    }

    console.log("✅ 직원 계정 생성 완료:", userData);

    return NextResponse.json({
      success: true,
      data: userData,
      message: "직원 계정이 생성되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 직원 계정 생성 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/staff?userId=xxx
 * 직원 계정 삭제 (ADMIN만 접근 가능)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. users 테이블에서 auth_id 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("auth_id, email, role")
      .eq("id", userId)
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

