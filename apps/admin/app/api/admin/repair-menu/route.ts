import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 수선 카테고리 및 항목 조회 API (관리자용)
 */
export async function GET() {
  try {
    // Service Role Key로 직접 클라이언트 생성 (RLS 완전 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔑 Service Role Key 존재:', !!serviceRoleKey);
    
    // Service Role Key 대신 anon key 사용 (RLS 정책으로 모든 카테고리 조회 가능)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, anonKey);

    // 카테고리 조회 (오름차순)
    const { data: categoriesData, error: catError } = await supabaseAdmin
      .from('repair_categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    console.log('📦 조회된 카테고리 수:', categoriesData?.length);

    if (catError) {
      console.error('카테고리 조회 실패:', catError);
      return NextResponse.json(
        { success: false, error: catError.message },
        { status: 500 }
      );
    }

    // 각 카테고리별 수선 종류 조회
    const categoriesWithTypes = await Promise.all(
      (categoriesData || []).map(async (cat) => {
        const { data: typesData } = await supabaseAdmin
          .from('repair_types')
          .select('*')
          .eq('category_id', cat.id)
          .order('display_order', { ascending: true });

        return {
          ...cat,
          repair_types: typesData || [],
        };
      })
    );

    return NextResponse.json({ success: true, data: categoriesWithTypes });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

