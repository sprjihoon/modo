import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 카테고리 추가 API (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon_name, display_order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '카테고리명은 필수입니다' },
        { status: 400 }
      );
    }

    // 중복 체크
    const { data: existingCategory } = await supabaseAdmin
      .from('repair_categories')
      .select('id, name')
      .eq('name', name)
      .single();

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: `"${name}" 카테고리가 이미 존재합니다. 다른 이름을 사용해주세요.` },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('repair_categories')
      .insert({
        name,
        icon_name: icon_name || null,
        display_order: display_order || 999,
      })
      .select()
      .single();

    if (error) {
      console.error('카테고리 추가 실패:', error);
      
      // 중복 키 에러인 경우 더 명확한 메시지 제공
      if (error.code === '23505' && error.message.includes('repair_categories_name_key')) {
        return NextResponse.json(
          { success: false, error: `"${name}" 카테고리가 이미 존재합니다. 다른 이름을 사용해주세요.` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 수정 API (관리자용)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, icon_name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'ID와 카테고리명은 필수입니다' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('repair_categories')
      .update({
        name,
        icon_name: icon_name || null,
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('카테고리 수정 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 수정된 데이터가 있으면 첫 번째 항목 반환, 없으면 null
    return NextResponse.json({ success: true, data: data?.[0] || null });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 카테고리 삭제 API (관리자용)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID는 필수입니다' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('repair_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('카테고리 삭제 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
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

