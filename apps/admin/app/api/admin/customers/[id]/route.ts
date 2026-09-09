import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * DELETE /api/admin/customers/[id]
 * 고객 계정 삭제
 * - Auth 계정 삭제 (로그인 불가)
 * - users 레코드 익명화 (이메일/이름/전화번호) → 주문 이력 보존
 * - 주문 없는 경우: users 레코드도 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { id } = await params;

    // 고객 정보 조회
    const { data: user, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, auth_id, email, name, role")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !user) {
      return NextResponse.json(
        { success: false, error: "고객을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 직원 계정은 이 API로 삭제 불가
    if (["SUPER_ADMIN", "ADMIN", "MANAGER", "WORKER"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "직원 계정은 직원 관리에서 삭제하세요." },
        { status: 400 }
      );
    }

    // 이미 삭제된 계정
    if (user.email?.startsWith("deleted_")) {
      return NextResponse.json(
        { success: false, error: "이미 삭제된 계정입니다." },
        { status: 400 }
      );
    }

    console.log("🗑️ 고객 계정 삭제 시작:", user.email);

    // 주문 존재 여부 확인
    const { count: orderCount } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id);

    const hasOrders = orderCount != null && orderCount > 0;

    if (hasOrders) {
      // 주문 있음: 익명화 처리 (주문 이력 보존)
      const anonymizedEmail = `deleted_${id}@deleted.modorepair.com`;
      await supabaseAdmin
        .from("users")
        .update({
          email: anonymizedEmail,
          name: "탈퇴회원",
          phone: "000-0000-0000",
        })
        .eq("id", id);
      console.log(`✅ 주문 있음 → 익명화 처리 (${orderCount}건 보존)`);
    } else {
      // 주문 없음: users 레코드 삭제
      await supabaseAdmin.from("users").delete().eq("id", id);
      console.log("✅ 주문 없음 → users 레코드 삭제");
    }

    // Auth 계정 삭제 (로그인 불가)
    if (user.auth_id) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
      if (authDeleteError) {
        console.warn("⚠️ Auth 계정 삭제 실패:", authDeleteError.message);
      } else {
        console.log("✅ Auth 계정 삭제 완료");
      }
    }

    return NextResponse.json({
      success: true,
      message: hasOrders
        ? `고객 계정이 삭제되었습니다. (주문 ${orderCount}건 이력 보존)`
        : "고객 계정이 완전히 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 고객 삭제 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
