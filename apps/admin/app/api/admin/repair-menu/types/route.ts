import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 수선 항목 추가 API (관리자용)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      category_id,
      name,
      icon_name,
      description,
      price,
      display_order,
      requires_measurement,
      requires_multiple_inputs,
      input_count,
      input_labels,
      has_sub_parts,
      allow_multiple_sub_parts,
      sub_parts_title,
      sub_parts,
    } = body;

    if (!category_id || !name || !price) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      );
    }

    // 1. 수선 종류 추가
    const { data: repairTypeData, error } = await supabaseAdmin
      .from('repair_types')
      .insert({
        category_id,
        name,
        icon_name: icon_name || null,
        description: description || null,
        price: parseInt(price),
        display_order: display_order || 999,
        requires_measurement: requires_measurement ?? true,
        requires_multiple_inputs: requires_multiple_inputs || false,
        input_count: input_count || 1,
        input_labels: input_labels || ['치수 (cm)'],
        has_sub_parts: has_sub_parts || false,
        allow_multiple_sub_parts: allow_multiple_sub_parts || false,
        sub_parts_title: sub_parts_title || null,
      })
      .select()
      .single();

    if (error) {
      console.error('수선 항목 추가 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 2. 세부 부위 추가 (있는 경우)
    if (has_sub_parts && sub_parts && sub_parts.length > 0 && repairTypeData) {
      const subPartsData = sub_parts.map((part: any, index: number) => ({
        repair_type_id: repairTypeData.id,
        name: part.name,
        part_type: 'sub_part',
        icon_name: part.icon || null,
        price: part.price || 0,
        display_order: index + 1,
      }));

      const { error: subPartsError } = await supabaseAdmin
        .from('repair_sub_parts')
        .insert(subPartsData);

      if (subPartsError) {
        console.error('세부 부위 추가 실패:', subPartsError);
      }
    }

    return NextResponse.json({ success: true, data: repairTypeData });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 수선 항목 수정 API (관리자용)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      price,
      requires_measurement,
      requires_multiple_inputs,
      input_count,
      input_labels,
      has_sub_parts,
      allow_multiple_sub_parts,
      sub_parts_title,
      sub_parts,
    } = body;

    if (!id || !name || !price) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('repair_types')
      .update({
        name,
        description: description || null,
        price: parseInt(price),
        requires_measurement: requires_measurement ?? true,
        requires_multiple_inputs: requires_multiple_inputs || false,
        input_count: input_count || 1,
        input_labels: input_labels || ['치수 (cm)'],
        has_sub_parts: has_sub_parts || false,
        allow_multiple_sub_parts: allow_multiple_sub_parts || false,
        sub_parts_title: sub_parts_title || null,
      })
      .eq('id', id);

    if (error) {
      console.error('수선 항목 수정 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 세부 부위 업데이트
    if (has_sub_parts && sub_parts && sub_parts.length > 0) {
      // 기존 세부 부위 삭제
      await supabaseAdmin
        .from('repair_sub_parts')
        .delete()
        .eq('repair_type_id', id)
        .eq('part_type', 'sub_part');

      // 새 세부 부위 추가
      const subPartsData = sub_parts.map((part: any, index: number) => ({
        repair_type_id: id,
        name: part.name,
        part_type: 'sub_part',
        icon_name: part.icon || null,
        price: part.price || 0,
        display_order: index + 1,
      }));

      const { error: subPartsError } = await supabaseAdmin
        .from('repair_sub_parts')
        .insert(subPartsData);

      if (subPartsError) {
        console.error('세부 부위 저장 실패:', subPartsError);
      }
    } else if (!has_sub_parts) {
      // 세부 부위 체크 해제 시 기존 데이터 삭제
      await supabaseAdmin
        .from('repair_sub_parts')
        .delete()
        .eq('repair_type_id', id)
        .eq('part_type', 'sub_part');
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

/**
 * 수선 항목 삭제 API (관리자용)
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
      .from('repair_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('수선 항목 삭제 실패:', error);
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

