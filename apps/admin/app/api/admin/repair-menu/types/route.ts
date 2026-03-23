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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:POST',message:'POST repair_type request',data:{name,icon_name,has_sub_parts,sub_parts_count:sub_parts?.length,sub_parts_icons:sub_parts?.map((p:any)=>({name:p.name,icon:p.icon}))},timestamp:Date.now(),hypothesisId:'A,B,E'})}).catch(()=>{});
    // #endregion

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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:POST:subParts',message:'Inserting sub_parts to DB',data:{subPartsData},timestamp:Date.now(),hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion

      const { error: subPartsError } = await supabaseAdmin
        .from('repair_sub_parts')
        .insert(subPartsData);

      if (subPartsError) {
        console.error('세부 부위 추가 실패:', subPartsError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:POST:subPartsError',message:'Sub parts insert error',data:{error:subPartsError.message},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:POST:success',message:'POST success',data:{repairTypeId:repairTypeData?.id,savedIconName:repairTypeData?.icon_name},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

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
      icon_name,
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:PUT',message:'PUT repair_type request',data:{id,name,icon_name,has_sub_parts,sub_parts_count:sub_parts?.length,sub_parts_icons:sub_parts?.map((p:any)=>({name:p.name,icon:p.icon}))},timestamp:Date.now(),hypothesisId:'A,B,E'})}).catch(()=>{});
    // #endregion

    if (!id || !name || !price) {
      return NextResponse.json(
        { success: false, error: '필수 항목이 누락되었습니다' },
        { status: 400 }
      );
    }

    const { data: updateData, error, count } = await supabaseAdmin
      .from('repair_types')
      .update({
        name,
        icon_name: icon_name || null,
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
      .eq('id', id)
      .select();

    // #region agent log
    console.log('[DEBUG:PUT] Update result:', { updateData, error, count, id, icon_name });
    fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:PUT:updateResult',message:'DB update result',data:{updateData,error:error?.message,count,id,icon_name},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

    if (error) {
      console.error('수선 항목 수정 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    if (!updateData || updateData.length === 0) {
      console.error('수선 항목 수정 실패: 업데이트된 row 없음 (RLS 정책 확인 필요)');
      return NextResponse.json(
        { success: false, error: '업데이트 실패: 권한이 없거나 해당 항목이 존재하지 않습니다' },
        { status: 403 }
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:PUT:subParts',message:'Updating sub_parts in DB',data:{subPartsData},timestamp:Date.now(),hypothesisId:'B,E'})}).catch(()=>{});
      // #endregion

      const { error: subPartsError } = await supabaseAdmin
        .from('repair_sub_parts')
        .insert(subPartsData);

      if (subPartsError) {
        console.error('세부 부위 저장 실패:', subPartsError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:PUT:subPartsError',message:'Sub parts update error',data:{error:subPartsError.message},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } else if (!has_sub_parts) {
      // 세부 부위 체크 해제 시 기존 데이터 삭제
      await supabaseAdmin
        .from('repair_sub_parts')
        .delete()
        .eq('repair_type_id', id)
        .eq('part_type', 'sub_part');
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b2375dfe-4ef7-4e43-8b9d-f2b7ae038a52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'types/route.ts:PUT:success',message:'PUT success',data:{id,icon_name},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

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

