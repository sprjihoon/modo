import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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

// 역할 타입 정의
type StaffRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "WORKER";

/**
 * GET /api/admin/staff
 * 전체 직원 목록 조회 (staff 테이블에서)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    // staff 테이블에서 직원 목록 조회
    let query = supabaseAdmin
      .from("staff")
      .select("id, auth_id, email, name, phone, role, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // 역할 필터링
    if (roleFilter && ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"].includes(roleFilter)) {
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
 * 직원 계정 생성 (staff 테이블에)
 */
export async function POST(request: NextRequest) {
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

    // 역할 검증
    const validRoles: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    // 이메일 중복 체크 (staff 테이블)
    const { data: existingStaff } = await supabaseAdmin
      .from("staff")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    console.log("📝 직원 계정 생성 시작:", { email, name, role });

    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
        role,
        is_staff: true,
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

    // 2. staff 테이블에 프로필 생성
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from("staff")
      .insert({
        auth_id: authData.user.id,
        email,
        name,
        phone,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (staffError) {
      console.error("❌ 직원 프로필 생성 실패:", staffError);
      // Auth 계정 삭제
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: staffError.message },
        { status: 500 }
      );
    }

    console.log("✅ 직원 계정 생성 완료:", staffData);

    return NextResponse.json({
      success: true,
      data: staffData,
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
