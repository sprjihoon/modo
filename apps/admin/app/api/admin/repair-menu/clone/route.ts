import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/ops-auth";

type SourceKind = "category" | "repair_type";

async function uniqueCategoryName(
  baseName: string,
  parentId: string | null
): Promise<string> {
  let name = baseName;
  for (let i = 0; i < 50; i++) {
    let q = supabaseAdmin
      .from("repair_categories")
      .select("id")
      .eq("name", name);
    q = parentId
      ? q.eq("parent_category_id", parentId)
      : q.is("parent_category_id", null);
    const { data } = await q.maybeSingle();
    if (!data) return name;
    name = i === 0 ? `${baseName} 복사` : `${baseName} 복사${i + 1}`;
  }
  return `${baseName} 복사${Date.now()}`;
}

async function uniqueTypeName(
  baseName: string,
  categoryId: string
): Promise<string> {
  let name = baseName;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabaseAdmin
      .from("repair_types")
      .select("id")
      .eq("category_id", categoryId)
      .eq("name", name)
      .maybeSingle();
    if (!data) return name;
    name = i === 0 ? `${baseName} 복사` : `${baseName} 복사${i + 1}`;
  }
  return `${baseName} 복사${Date.now()}`;
}

async function cloneRepairType(
  sourceTypeId: string,
  targetCategoryId: string,
  newName?: string
) {
  const { data: source, error } = await supabaseAdmin
    .from("repair_types")
    .select("*")
    .eq("id", sourceTypeId)
    .single();

  if (error || !source) {
    throw new Error(error?.message || "수선 항목을 찾을 수 없습니다.");
  }

  const name = await uniqueTypeName(newName?.trim() || source.name, targetCategoryId);

  const { data: created, error: insertError } = await supabaseAdmin
    .from("repair_types")
    .insert({
      category_id: targetCategoryId,
      name,
      icon_name: source.icon_name,
      description: source.description,
      price: source.price,
      display_order: 999,
      is_active: source.is_active ?? true,
      requires_measurement: source.requires_measurement,
      requires_multiple_inputs: source.requires_multiple_inputs,
      input_count: source.input_count,
      input_labels: source.input_labels,
      has_sub_parts: source.has_sub_parts,
      allow_multiple_sub_parts: source.allow_multiple_sub_parts,
      show_all_option: source.show_all_option,
      all_option_price: source.all_option_price,
      sub_parts_title: source.sub_parts_title,
    })
    .select()
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message || "수선 항목 복제 실패");
  }

  const { data: subParts } = await supabaseAdmin
    .from("repair_sub_parts")
    .select("*")
    .eq("repair_type_id", sourceTypeId)
    .order("display_order", { ascending: true });

  if (subParts && subParts.length > 0) {
    const { error: partsError } = await supabaseAdmin
      .from("repair_sub_parts")
      .insert(
        subParts.map((p) => ({
          repair_type_id: created.id,
          name: p.name,
          part_type: p.part_type || "sub_part",
          icon_name: p.icon_name,
          price: p.price,
          display_order: p.display_order,
        }))
      );
    if (partsError) {
      console.error("세부 부위 복제 실패:", partsError);
    }
  }

  return created;
}

async function cloneCategoryDeep(
  sourceCategoryId: string,
  targetParentId: string | null,
  newName?: string
) {
  const { data: source, error } = await supabaseAdmin
    .from("repair_categories")
    .select("*")
    .eq("id", sourceCategoryId)
    .single();

  if (error || !source) {
    throw new Error(error?.message || "카테고리를 찾을 수 없습니다.");
  }

  const name = await uniqueCategoryName(
    newName?.trim() || source.name,
    targetParentId
  );

  const { data: created, error: insertError } = await supabaseAdmin
    .from("repair_categories")
    .insert({
      name,
      icon_name: source.icon_name,
      display_order: 999,
      is_active: source.is_active ?? true,
      parent_category_id: targetParentId,
      price: source.price,
      price_range: source.price_range,
      description: source.description,
      requires_measurement: source.requires_measurement,
      input_count: source.input_count,
      input_labels: source.input_labels,
      sub_selection_label: source.sub_selection_label,
    } as any)
    .select()
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message || "카테고리 복제 실패");
  }

  // 하위 카테고리 복제
  const { data: children } = await supabaseAdmin
    .from("repair_categories")
    .select("id")
    .eq("parent_category_id", sourceCategoryId)
    .order("display_order", { ascending: true });

  for (const child of children || []) {
    await cloneCategoryDeep(child.id, created.id);
  }

  // 하위 repair_types 복제
  const { data: types } = await supabaseAdmin
    .from("repair_types")
    .select("id")
    .eq("category_id", sourceCategoryId)
    .order("display_order", { ascending: true });

  for (const type of types || []) {
    await cloneRepairType(type.id, created.id);
  }

  return created;
}

/**
 * POST /api/admin/repair-menu/clone
 * body: {
 *   source_kind: 'category' | 'repair_type',
 *   source_id: string,
 *   target_parent_category_id: string | null,  // category: 새 부모 / type: 대상 category_id
 *   new_name?: string,
 *   deep?: boolean  // category만, 기본 true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await request.json();
    const sourceKind = body.source_kind as SourceKind;
    const sourceId = body.source_id as string;
    const targetParentId =
      body.target_parent_category_id === undefined
        ? null
        : (body.target_parent_category_id as string | null);
    const newName = body.new_name as string | undefined;

    if (!sourceKind || !sourceId) {
      return NextResponse.json(
        { success: false, error: "source_kind, source_id는 필수입니다." },
        { status: 400 }
      );
    }

    if (sourceKind === "repair_type") {
      if (!targetParentId) {
        return NextResponse.json(
          { success: false, error: "복제할 대상 카테고리를 선택해주세요." },
          { status: 400 }
        );
      }
      const data = await cloneRepairType(sourceId, targetParentId, newName);
      return NextResponse.json({ success: true, data });
    }

    if (sourceKind === "category") {
      // 자기 자신 아래로 복제 방지
      if (targetParentId === sourceId) {
        return NextResponse.json(
          { success: false, error: "자기 자신 아래로는 복제할 수 없습니다." },
          { status: 400 }
        );
      }
      const data = await cloneCategoryDeep(sourceId, targetParentId, newName);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: "지원하지 않는 source_kind입니다." },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("복제 실패:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || "복제 실패" },
      { status: 500 }
    );
  }
}
