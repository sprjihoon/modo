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

// Supabase Client (사용자 인증용)
const createSupabaseClient = async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    }
  );
};

/**
 * GET /api/admin/my-account
 * 현재 로그인된 사용자 프로필 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 인증 정보 가져오기
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    
    if (!accessToken) {
      // Authorization 헤더에서 시도
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: "인증이 필요합니다." },
          { status: 401 }
        );
      }
    }

    // 현재 사용자 조회 (supabase auth에서)
    const supabase = await createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // 세션에서 이메일 가져오기 시도 (대체 방법)
      const emailFromCookie = cookieStore.get('admin-email')?.value;
      
      if (emailFromCookie) {
        // staff 테이블에서 조회
        const { data: staffData, error: staffError } = await supabaseAdmin
          .from("staff")
          .select("id, email, name, phone, role, created_at")
          .eq("email", emailFromCookie)
          .eq("is_active", true)
          .maybeSingle();

        if (staffData) {
          return NextResponse.json({
            success: true,
            data: staffData,
          });
        }
      }

      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 401 }
      );
    }

    // staff 테이블에서 프로필 조회
    const { data: staffProfile, error: profileError } = await supabaseAdmin
      .from("staff")
      .select("id, email, name, phone, role, created_at")
      .eq("auth_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (profileError || !staffProfile) {
      // users 테이블에서 시도 (레거시 지원)
      const { data: userProfile } = await supabaseAdmin
        .from("users")
        .select("id, email, name, phone, role, created_at")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (userProfile) {
        return NextResponse.json({
          success: true,
          data: userProfile,
        });
      }

      return NextResponse.json(
        { success: false, error: "프로필을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: staffProfile,
    });
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

    // 쿠키에서 이메일 가져오기
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('admin-email')?.value;

    // 현재 사용자 조회
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    let staffId: string | null = null;

    if (user) {
      // auth_id로 staff 조회
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();
      
      staffId = staff?.id || null;
    }

    if (!staffId && emailFromCookie) {
      // 이메일로 staff 조회
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("email", emailFromCookie)
        .maybeSingle();
      
      staffId = staff?.id || null;
    }

    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 프로필 업데이트
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("staff")
      .update({
        name,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", staffId)
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

