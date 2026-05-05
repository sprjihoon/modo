import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 일회성 카테고리 계층 구조 설정 API
 * POST /api/admin/apply-hierarchy
 *
 * migration 015_setup_category_hierarchy.sql 내용을 JS 클라이언트로 실행
 */
export async function POST() {
  try {
    // 1. 대카테고리 upsert
    const { error: upsertErr } = await supabaseAdmin
      .from("repair_categories")
      .upsert(
        [
          { name: "상의",   display_order: 1, icon_name: "shirt",      is_active: true },
          { name: "하의",   display_order: 2, icon_name: "pants",      is_active: true },
          { name: "원피스", display_order: 3, icon_name: "dress",      is_active: true },
          { name: "부속품", display_order: 4, icon_name: "repair_top", is_active: true },
        ] as unknown as { name: string }[],
        { onConflict: "name" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: "대카테고리 upsert 실패", detail: upsertErr.message }, { status: 500 });
    }

    // 2. 각 대카테고리 ID 조회
    const { data: mainCats, error: fetchErr } = await supabaseAdmin
      .from("repair_categories")
      .select("id, name")
      .in("name", ["상의", "하의", "원피스", "부속품"])
      .is("parent_category_id", null);

    if (fetchErr || !mainCats) {
      return NextResponse.json({ error: "대카테고리 조회 실패", detail: fetchErr?.message }, { status: 500 });
    }

    const idOf = (name: string) => mainCats.find((c) => c.name === name)?.id;

    const mapping: { parent: string; children: string[] }[] = [
      { parent: "상의",   children: ["아우터", "티셔츠", "셔츠/맨투맨"] },
      { parent: "하의",   children: ["바지", "청바지", "치마"] },
      { parent: "원피스", children: ["원피스"] },
      { parent: "부속품", children: ["부속품 수선 (상의)", "부속품 수선 (하의)"] },
    ];

    const results: Record<string, unknown>[] = [];

    for (const { parent, children } of mapping) {
      const parentId = idOf(parent);
      if (!parentId) {
        results.push({ parent, status: "skip – id not found" });
        continue;
      }
      const { data, error } = await supabaseAdmin
        .from("repair_categories")
        .update({ parent_category_id: parentId } as unknown as { name: string })
        .in("name", children)
        .select("id, name, parent_category_id");

      results.push({ parent, parentId, updated: data?.length ?? 0, error: error?.message });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
