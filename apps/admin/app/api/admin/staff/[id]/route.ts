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
const validRoles: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"];

/**
 * GET /api/admin/staff/[id]
 * 직원 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("id, auth_id, email, name, phone, role, is_active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "직원을 찾을 수 없습니다." },
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
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
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    // 1. 기존 직원 조회
    const { data: existingStaff, error: fetchError } = await supabaseAdmin
      .from("staff")
      .select("auth_id, email, phone, role")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existingStaff) {
      return NextResponse.json(
        { success: false, error: "직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 전화번호가 변경된 경우 중복 체크
    if (phone !== existingStaff.phone) {
      const { data: phoneCheck } = await supabaseAdmin
        .from("staff")
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

    console.log("📝 직원 정보 수정 시작:", existingStaff.email);

    // 2. staff 테이블 업데이트
    const { data: updatedStaff, error: updateError } = await supabaseAdmin
      .from("staff")
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
      console.error("❌ 직원 정보 수정 실패:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // 3. 비밀번호 변경 요청이 있는 경우
    if (password && password.length >= 6 && existingStaff.auth_id) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        existingStaff.auth_id,
        { password }
      );

      if (passwordError) {
        console.error("⚠️ 비밀번호 변경 실패:", passwordError);
      } else {
        console.log("✅ 비밀번호 변경 완료");
      }
    }

    console.log("✅ 직원 정보 수정 완료:", updatedStaff);

    return NextResponse.json({
      success: true,
      data: updatedStaff,
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
 * 직원 계정 삭제 (비활성화)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // 1. staff 테이블에서 auth_id 조회
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("auth_id, email, role")
      .eq("id", id)
      .maybeSingle();

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: "직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // SUPER_ADMIN 계정은 삭제 불가
    if (staff.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "최고관리자 계정은 삭제할 수 없습니다." },
        { status: 403 }
      );
    }

    console.log("🗑️ 직원 계정 삭제 시작:", staff.email);

    // 2. staff 테이블에서 비활성화 (soft delete)
    const { error: deactivateError } = await supabaseAdmin
      .from("staff")
      .update({ is_active: false })
      .eq("id", id);

    if (deactivateError) {
      console.error("❌ 직원 비활성화 실패:", deactivateError);
      return NextResponse.json(
        { success: false, error: deactivateError.message },
        { status: 500 }
      );
    }

    // 3. Auth 계정도 삭제 (선택적)
    if (staff.auth_id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(staff.auth_id);
      if (deleteError) {
        console.error("⚠️ Auth 계정 삭제 실패:", deleteError);
        // Auth 삭제 실패해도 계속 진행
      }
    }

    console.log("✅ 직원 계정 삭제 완료:", staff.email);

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
