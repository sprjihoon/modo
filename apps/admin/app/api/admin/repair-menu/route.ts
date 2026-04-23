import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 수선 카테고리 및 항목 조회 API (관리자용)
 * 반환 구조:
 *   mainCategories: 대카테고리 목록 (parent_category_id IS NULL)
 *     └ subCategories: 소카테고리 목록 (parent_category_id = 대카테고리.id)
 *         └ repair_types: 수선 항목 목록
 *   legacyCategories: parent_category_id가 없는 기존 카테고리 (하위 호환)
 */
export async function GET() {
  try {
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

    const all = (categoriesData || []) as any[];

    // parent_category_id 컬럼 존재 여부 확인 (마이그레이션 전 호환)
    const hasParentField = all.length === 0 || 'parent_category_id' in all[0];

    // 수선 항목 전체 조회
    const { data: allTypes } = await supabaseAdmin
      .from('repair_types')
      .select('*')
      .order('display_order', { ascending: true });

    const typesMap: Record<string, any[]> = {};
    for (const t of allTypes || []) {
      if (!typesMap[t.category_id]) typesMap[t.category_id] = [];
      typesMap[t.category_id].push(t);
    }

    if (!hasParentField) {
      // 마이그레이션 미적용: 기존 flat 구조 그대로 반환
      const data = all.map(cat => ({ ...cat, repair_types: typesMap[cat.id] || [] }));
      return NextResponse.json({ success: true, data, hierarchical: false });
    }

    // 대카테고리 (parent_category_id IS NULL)
    const mainCats = all.filter(c => !c.parent_category_id);
    // 소카테고리 (parent_category_id NOT NULL)
    const subCats = all.filter(c => !!c.parent_category_id);

    const mainWithSubs = mainCats.map(main => ({
      ...main,
      sub_categories: subCats
        .filter(sub => sub.parent_category_id === main.id)
        .map(sub => ({
          ...sub,
          repair_types: typesMap[sub.id] || [],
        })),
      // 대카테고리에 직접 연결된 수선 항목도 지원
      repair_types: typesMap[main.id] || [],
    }));

    // 어느 대카테고리에도 속하지 않는 소카테고리 (parent 없이 단독으로 있는 기존 카테고리)
    const orphanCats = subCats.filter(
      sub => !mainCats.find(m => m.id === sub.parent_category_id)
    ).map(cat => ({ ...cat, repair_types: typesMap[cat.id] || [] }));

    // 대카테고리가 없는 기존 flat 카테고리도 함께 반환
    const flatCats = mainCats.length === 0
      ? all.map(cat => ({ ...cat, repair_types: typesMap[cat.id] || [] }))
      : [];

    return NextResponse.json({
      success: true,
      hierarchical: mainCats.length > 0,
      // 2단계 계층 구조 (대카테고리 → 소카테고리 → 수선항목)
      mainCategories: mainWithSubs,
      // 어느 대카테고리에도 속하지 않은 기존 카테고리
      data: [...orphanCats, ...flatCats],
    });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

