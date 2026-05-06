import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // parent_category_id 컬럼 포함 시도, 없으면 fallback
    let { data: categories, error: catError } = await supabase
      .from("repair_categories")
      .select("id, name, display_order, icon_name, is_active, parent_category_id, price, description")
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
      categories = (fallback.data ?? []).map((c) => ({ ...c, parent_category_id: null, price: null, description: null }));
      catError = fallback.error;
    }

    if (catError) {
      console.error("repair_categories error:", catError.message);
      return NextResponse.json({ error: "카테고리 데이터를 불러올 수 없습니다", data: [] }, { status: 200 });
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
        const mainIds = new Set(mainCats.map((m) => m.id));
        const directChildIds = new Set(
          subCats.filter((s) => mainIds.has(s.parent_category_id)).map((s) => s.id)
        );

        const mainWithSubs = mainCats.map((main) => {
          const directChildren = subCats.filter((s) => s.parent_category_id === main.id);

          const sub_categories = directChildren.map((sub) => {
            // 3단계: 이 소카테고리의 자식 카테고리 (세부항목)
            const thirdLevel = subCats.filter((s) => s.parent_category_id === sub.id);

            const directRepairTypes = repairTypes.filter((t) => t.category_id === sub.id);

            // 3단계 카테고리를 repair_type 형태로 변환
            const thirdLevelItems = thirdLevel.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description ?? null,
              price: item.price ?? null,
              category_id: sub.id,
              display_order: item.display_order,
            }));

            // 3단계 항목의 repair_types 포함
            const thirdLevelRepairTypes = thirdLevel.flatMap((item) =>
              repairTypes.filter((t) => t.category_id === item.id)
            );

            return {
              ...sub,
              repair_types: [...directRepairTypes, ...thirdLevelItems, ...thirdLevelRepairTypes],
            };
          });

          return {
            ...main,
            sub_categories,
            repair_types: repairTypes.filter((t) => t.category_id === main.id),
          };
        });

        // 어느 대카테고리에도 속하지 않고 직속 자식의 하위도 아닌 orphan
        const allKnownParentIds = new Set([...mainIds, ...directChildIds]);
        const orphanSubs = subCats
          .filter((s) => !allKnownParentIds.has(s.parent_category_id))
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
    console.error("repair-categories error:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다", data: [] }, { status: 200 });
  }
}
