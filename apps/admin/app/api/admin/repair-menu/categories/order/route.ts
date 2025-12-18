import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 카테고리 순서 변경 API (관리자용)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: '업데이트 데이터가 필요합니다' },
        { status: 400 }
      );
    }

    // 각 카테고리의 display_order 업데이트
    for (const update of updates) {
      const { id, display_order } = update;
      
      await supabaseAdmin
        .from('repair_categories')
        .update({ display_order })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

