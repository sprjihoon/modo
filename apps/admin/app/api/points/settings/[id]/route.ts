import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 포인트 설정 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settingId = params.id;
    const body = await request.json();
    const { 
      name, 
      description, 
      earningRate, 
      startDate, 
      endDate, 
      isActive, 
      isDefault, 
      priority 
    } = body;

    // 입력 검증
    if (earningRate !== undefined && (earningRate < 0 || earningRate > 100)) {
      return NextResponse.json(
        { error: '적립률은 0%에서 100% 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 기본 설정으로 지정하는 경우 기존 기본 설정 해제
    if (isDefault) {
      await supabase
        .from('point_settings')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', settingId);
    }

    // 업데이트할 데이터 구성
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (earningRate !== undefined) updateData.earning_rate = earningRate;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    if (priority !== undefined) updateData.priority = priority;

    // 포인트 설정 업데이트
    const { data, error } = await supabase
      .from('point_settings')
      .update(updateData)
      .eq('id', settingId)
      .select()
      .single();

    if (error) {
      console.error('포인트 설정 수정 오류:', error);
      return NextResponse.json(
        { error: '포인트 설정 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '포인트 설정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '포인트 설정이 수정되었습니다.',
      setting: data
    });

  } catch (error) {
    console.error('포인트 설정 수정 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 포인트 설정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settingId = params.id;

    // 포인트 설정 삭제
    const { error } = await supabase
      .from('point_settings')
      .delete()
      .eq('id', settingId);

    if (error) {
      console.error('포인트 설정 삭제 오류:', error);
      return NextResponse.json(
        { error: '포인트 설정 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '포인트 설정이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('포인트 설정 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

