import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();

    // parent_category_id 컬럼 포함 시도, 없으면 fallback
    let { data: categories, error: catError } = await supabase
      .from("repair_categories")
      .select("id, name, display_order, icon_name, is_active, parent_category_id")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // parent_category_id 컬럼이 없는 경우 (마이그레이션 미적용) → 기본 컬럼만 조회
    if (catError && catError.message?.includes("parent_category_id")) {
      const fallback = await supabase
        .from("repair_categories")
        .select("id, name, display_order, icon_name, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      // parent_category_id 없이 가져온 데이터에 null 기본값 추가
      categories = (fallback.data ?? []).map((c) => ({ ...c, parent_category_id: null }));
      catError = fallback.error;
    }

    if (catError) {
      console.error("repair_categories error:", catError.message);
      return NextResponse.json({ error: catError.message, data: [] }, { status: 200 });
    }

    const { data: types, error: typeError } = await supabase
      .from("repair_types")
      .select("id, name, description, price, category_id, display_order")
      .order("display_order", { ascending: true });

    if (typeError) {
      console.error("repair_types error:", typeError.message);
    }

    const repairTypes = types ?? [];
    const allCats = categories ?? [];

    // parent_category_id 컬럼 존재 여부 확인
    const hasParent = allCats.length === 0 || "parent_category_id" in allCats[0];

    if (hasParent) {
      const mainCats = allCats.filter((c) => !c.parent_category_id);
      const subCats = allCats.filter((c) => !!c.parent_category_id);

      if (mainCats.length > 0) {
        // 2단계 계층 구조
        const mainWithSubs = mainCats.map((main) => ({
          ...main,
          sub_categories: subCats
            .filter((s) => s.parent_category_id === main.id)
            .map((sub) => ({
              ...sub,
              repair_types: repairTypes.filter((t) => t.category_id === sub.id),
            })),
          repair_types: repairTypes.filter((t) => t.category_id === main.id),
        }));

        // 어느 대카테고리에도 속하지 않은 소카테고리
        const orphanSubs = subCats
          .filter((s) => !mainCats.find((m) => m.id === s.parent_category_id))
          .map((cat) => ({
            ...cat,
            repair_types: repairTypes.filter((t) => t.category_id === cat.id),
          }));

        const uncategorized = repairTypes.filter(
          (t) => !t.category_id || !allCats.find((c) => c.id === t.category_id)
        );

        return NextResponse.json({
          hierarchical: true,
          mainCategories: mainWithSubs,
          data: orphanSubs,
          uncategorized,
        });
      }
    }

    // flat 구조 (기존 방식 or 마이그레이션 전)
    const result = allCats.map((cat) => ({
      ...cat,
      repair_types: repairTypes.filter((t) => t.category_id === cat.id),
    }));

    const uncategorized = repairTypes.filter(
      (t) => !t.category_id || !allCats.find((c) => c.id === t.category_id)
    );

    return NextResponse.json({ hierarchical: false, data: result, uncategorized });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg, data: [] }, { status: 200 });
  }
}
