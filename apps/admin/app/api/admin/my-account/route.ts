import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
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
 * GET /api/admin/my-account
 * 현재 로그인된 사용자 프로필 조회
 * - 먼저 users 테이블에서 조회 (기존 ADMIN 계정)
 * - 없으면 staff 테이블에서 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 서버 사이드 Supabase 클라이언트 사용 (쿠키 자동 처리)
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // 쿠키에서 이메일 가져오기 (fallback용)
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('admin-email')?.value;
    
    if (authError) {
      console.error("❌ 인증 오류:", authError.message);
    }
    
    if (!user && !emailFromCookie) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다. 다시 로그인해주세요." },
        { status: 401 }
      );
    }

    console.log("🔍 프로필 조회 디버깅:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasEmailCookie: !!emailFromCookie,
      emailCookie: emailFromCookie,
      authError: authError?.message,
    });

    // auth_id로 조회 시도
    if (user) {
      // 1. users 테이블에서 먼저 조회 (기존 ADMIN 계정 - 우선순위)
      const { data: userProfile } = await supabaseAdmin
        .from("users")
        .select("id, email, name, phone, role, created_at")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (userProfile) {
        return NextResponse.json({
          success: true,
          data: userProfile,
          source: "users",
        });
      }

      // 2. staff 테이블에서 조회
      const { data: staffProfile } = await supabaseAdmin
        .from("staff")
        .select("id, email, name, phone, role, created_at")
        .eq("auth_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staffProfile) {
        return NextResponse.json({
          success: true,
          data: staffProfile,
          source: "staff",
        });
      }
    }

    // 이메일로 조회 시도 (쿠키에서)
    if (emailFromCookie) {
      // 1. users 테이블에서 먼저 조회
      const { data: userByEmail } = await supabaseAdmin
        .from("users")
        .select("id, email, name, phone, role, created_at")
        .eq("email", emailFromCookie)
        .maybeSingle();

      if (userByEmail) {
        return NextResponse.json({
          success: true,
          data: userByEmail,
          source: "users",
        });
      }

      // 2. staff 테이블에서 조회
      const { data: staffByEmail } = await supabaseAdmin
        .from("staff")
        .select("id, email, name, phone, role, created_at")
        .eq("email", emailFromCookie)
        .eq("is_active", true)
        .maybeSingle();

      if (staffByEmail) {
        return NextResponse.json({
          success: true,
          data: staffByEmail,
          source: "staff",
        });
      }
    }

    // 사용자를 찾지 못한 경우 상세 정보 반환
    const errorMessage = !user && !emailFromCookie
      ? "인증 정보가 없습니다. 다시 로그인해주세요."
      : `사용자를 찾을 수 없습니다. (user: ${user?.id || "없음"}, email: ${user?.email || emailFromCookie || "없음"})`;
    
    console.error("❌ 프로필 조회 실패:", errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("❌ 프로필 조회 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/my-account
 * 프로필 수정 (이름, 전화번호)
 * - users 또는 staff 테이블에서 사용자를 찾아 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "이름은 필수입니다." },
        { status: 400 }
      );
    }

    // 서버 사이드 Supabase 클라이언트 사용
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 쿠키에서 이메일 가져오기 (fallback용)
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('admin-email')?.value;

    let targetId: string | null = null;
    let targetTable: "users" | "staff" = "users";

    // 1. auth_id로 users 테이블 먼저 조회
    if (user) {
      const { data: userRecord } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      
      if (userRecord) {
        targetId = userRecord.id;
        targetTable = "users";
      } else {
        // 2. staff 테이블에서 조회
        const { data: staffRecord } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("auth_id", user.id)
          .maybeSingle();
        
        if (staffRecord) {
          targetId = staffRecord.id;
          targetTable = "staff";
        }
      }
    }

    // 3. 이메일로 조회 (fallback)
    if (!targetId && emailFromCookie) {
      const { data: userByEmail } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", emailFromCookie)
        .maybeSingle();
      
      if (userByEmail) {
        targetId = userByEmail.id;
        targetTable = "users";
      } else {
        const { data: staffByEmail } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("email", emailFromCookie)
          .maybeSingle();
        
        if (staffByEmail) {
          targetId = staffByEmail.id;
          targetTable = "staff";
        }
      }
    }

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로필 업데이트
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from(targetTable)
      .update({
        name,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ 프로필 업데이트 실패:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: "프로필이 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ 프로필 수정 중 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

