import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 수선 카테고리 및 항목 조회 API (관리자용)
 */
export async function GET() {
  try {
    // 카테고리 조회 (오름차순)
    const { data: categoriesData, error: catError } = await supabaseAdmin
      .from('repair_categories')
      .select('*')
      .order('display_order', { ascending: true });

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

