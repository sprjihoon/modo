import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ops-auth";
import {
  canAssignRole,
  canDeleteStaff,
  canEditStaff,
  isStaffRole,
} from "@/lib/staff-permissions";

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

/**
 * GET /api/admin/staff/[id]
 * 직원 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

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
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    const { name, phone, role, password, email } = body;

    // 입력 검증
    if (!name || !phone || !role) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!isStaffRole(role) || !canAssignRole(auth.user.role, role)) {
      return NextResponse.json(
        { success: false, error: "부여할 수 없는 역할입니다." },
        { status: 403 }
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

    if (!isStaffRole(existingStaff.role) || !canEditStaff(auth.user.role, existingStaff.role)) {
      return NextResponse.json(
        { success: false, error: "이 계정을 수정할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const newEmail = email?.trim() || existingStaff.email;

    console.log("📝 직원 정보 수정 시작:", existingStaff.email);

    // 2. Auth 계정 업데이트 (이메일·비밀번호 변경)
    if (existingStaff.auth_id) {
      // Auth에 해당 유저가 실제 존재하는지 확인
      const { data: authUser, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(
        existingStaff.auth_id
      );

      if (authLookupError || !authUser?.user) {
        // Auth에 없는 계정 → Auth 업데이트 스킵, DB만 업데이트
        console.warn("⚠️ Auth에 해당 유저 없음, DB만 업데이트:", existingStaff.auth_id);
      } else {
        const authUpdates: Record<string, any> = {};

        // Auth에서는 email을 소문자로 저장하므로 비교 시 소문자 정규화
        const authEmail = authUser.user.email?.toLowerCase() ?? "";
        if (newEmail.toLowerCase() !== authEmail) {
          authUpdates.email = newEmail;
        }
        if (password && password.length >= 6) {
          authUpdates.password = password;
        }

        if (Object.keys(authUpdates).length > 0) {
          // 이메일 변경 시: 다른 직원과의 중복만 체크 (고객과는 공유 가능)
          if (authUpdates.email) {
            const { data: staffDup } = await supabaseAdmin
              .from("staff")
              .select("id")
              .eq("email", newEmail)
              .eq("is_active", true)
              .neq("id", id)
              .maybeSingle();

            if (staffDup) {
              return NextResponse.json(
                { success: false, error: "이미 다른 직원이 사용 중인 이메일입니다." },
                { status: 400 }
              );
            }

            // 새 이메일이 이미 Auth에 존재(고객 등)하면 해당 auth_id로 staff 재연결
            const { data: existingOwner } = await supabaseAdmin
              .from("users")
              .select("auth_id")
              .eq("email", newEmail)
              .maybeSingle();

            if (existingOwner?.auth_id && existingOwner.auth_id !== existingStaff.auth_id) {
              // 새 Auth 계정에 직원 권한 부여
              await supabaseAdmin.auth.admin.updateUserById(existingOwner.auth_id, {
                ...(password ? { password } : {}),
                user_metadata: { name, phone, role, is_staff: true },
              });
              // staff 레코드를 새 auth_id로 재연결
              await supabaseAdmin
                .from("staff")
                .update({ auth_id: existingOwner.auth_id, email: newEmail, name, phone, role, updated_at: new Date().toISOString() })
                .eq("id", id);
              // 새 auth_id의 users 레코드 동기화
              await supabaseAdmin
                .from("users")
                .update({ name, phone, role })
                .eq("auth_id", existingOwner.auth_id);
              // 이전 auth_id의 users 레코드는 CUSTOMER로 다운그레이드 (목록 중복 방지)
              await supabaseAdmin
                .from("users")
                .update({ role: "CUSTOMER" })
                .eq("auth_id", existingStaff.auth_id);
              console.log("✅ 기존 Auth 계정으로 이메일 변경 완료, 이전 계정 CUSTOMER 처리:", newEmail);
              return NextResponse.json({ success: true, message: "직원 정보가 수정되었습니다." });
            }

            authUpdates.email_confirm = true;
          }

          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingStaff.auth_id,
            authUpdates
          );
          if (authUpdateError) {
            console.error("❌ Auth 계정 업데이트 실패:", authUpdateError.message);
            if (!authUpdates.email) {
              console.warn("⚠️ 비밀번호 변경 실패, DB는 계속 업데이트");
            } else {
              return NextResponse.json(
                { success: false, error: `이메일 변경 실패: ${authUpdateError.message}` },
                { status: 500 }
              );
            }
          } else {
            if (authUpdates.email) console.log("✅ Auth 이메일 변경 완료:", newEmail);
            if (authUpdates.password) console.log("✅ 비밀번호 변경 완료");
          }
        }
      }
    }

    // 3. staff 테이블 업데이트
    const { data: updatedStaff, error: updateError } = await supabaseAdmin
      .from("staff")
      .update({
        email: newEmail,
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

    // 4. users 테이블 동기화
    if (existingStaff.auth_id) {
      const { error: usersSyncError } = await supabaseAdmin
        .from("users")
        .update({ email: newEmail, name, phone, role })
        .eq("auth_id", existingStaff.auth_id);

      if (usersSyncError) {
        console.error("⚠️ users 테이블 동기화 실패:", usersSyncError);
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
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // 1. staff 테이블에서 조회 (없으면 users 테이블에서 찾아 role 다운그레이드)
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("auth_id, email, role")
      .eq("id", id)
      .maybeSingle();

    if (staffError || !staff) {
      // users 테이블 출처 항목일 수 있음 (id 또는 auth_id 기준으로 검색)
      const { data: userRecord } = await supabaseAdmin
        .from("users")
        .select("id, auth_id, role")
        .or(`id.eq.${id},auth_id.eq.${id}`)
        .maybeSingle();

      if (userRecord) {
        const targetRole = userRecord.role as string;
        if (isStaffRole(targetRole) && !canDeleteStaff(auth.user.role, targetRole as any)) {
          return NextResponse.json({ success: false, error: "이 계정을 삭제할 권한이 없습니다." }, { status: 403 });
        }
        // users.role을 CUSTOMER로 다운그레이드 (직원 목록에서 제거)
        await supabaseAdmin
          .from("users")
          .update({ role: "CUSTOMER" })
          .eq("id", userRecord.id);
        console.log("✅ users 출처 직원 → CUSTOMER 처리:", userRecord.auth_id);
        return NextResponse.json({ success: true, message: "직원 계정이 삭제되었습니다." });
      }

      // staff 테이블에서 email 기준으로도 시도 (비활성 포함)
      const { data: inactiveStaff } = await supabaseAdmin
        .from("staff")
        .select("auth_id, email, role")
        .eq("id", id)
        .maybeSingle();

      if (inactiveStaff) {
        await supabaseAdmin.from("staff").update({ is_active: false }).eq("id", id);
        if (inactiveStaff.auth_id) {
          await supabaseAdmin.from("users").update({ role: "CUSTOMER" }).eq("auth_id", inactiveStaff.auth_id);
        }
        return NextResponse.json({ success: true, message: "직원 계정이 삭제되었습니다." });
      }

      return NextResponse.json(
        { success: false, error: "직원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!isStaffRole(staff.role) || !canDeleteStaff(auth.user.role, staff.role)) {
      return NextResponse.json(
        { success: false, error: "이 계정을 삭제할 권한이 없습니다." },
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

    // 3. users 테이블 role도 CUSTOMER로 다운그레이드
    if (staff.auth_id) {
      await supabaseAdmin
        .from("users")
        .update({ role: "CUSTOMER" })
        .eq("auth_id", staff.auth_id);
    }

    // 4. Auth 계정도 삭제 (선택적)
    if (staff.auth_id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(staff.auth_id);
      if (deleteError) {
        console.error("⚠️ Auth 계정 삭제 실패:", deleteError);
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
