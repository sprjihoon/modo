import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// 포인트 설정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('point_settings')
      .select('*')
      .order('priority', { ascending: false })
      .order('start_date', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('포인트 설정 조회 오류:', error);
      return NextResponse.json(
        { error: '포인트 설정 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: settings || [] });

  } catch (error) {
    console.error('포인트 설정 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 포인트 설정 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      earningRate, 
      startDate, 
      endDate, 
      isActive, 
      isDefault, 
      priority,
      createdBy 
    } = body;

    // 입력 검증
    if (!name || !startDate) {
      return NextResponse.json(
        { error: '필수 항목을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (earningRate < 0 || earningRate > 100) {
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
        .eq('is_default', true);
    }

    // 포인트 설정 생성
    const { data, error } = await supabase
      .from('point_settings')
      .insert({
        name,
        description: description || null,
        earning_rate: earningRate,
        start_date: startDate,
        end_date: endDate || null,
        is_active: isActive !== undefined ? isActive : true,
        is_default: isDefault || false,
        priority: priority || 0,
        created_by: createdBy || null
      })
      .select()
      .single();

    if (error) {
      console.error('포인트 설정 생성 오류:', error);
      return NextResponse.json(
        { error: '포인트 설정 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '포인트 설정이 생성되었습니다.',
      setting: data
    });

  } catch (error) {
    console.error('포인트 설정 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

