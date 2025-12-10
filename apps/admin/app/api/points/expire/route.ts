import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// POST: 만료된 포인트 수동 소멸 실행
export async function POST(request: NextRequest) {
  try {
    // expire_points_manual 함수 호출
    const { data, error } = await supabaseAdmin.rpc('expire_points_manual');

    if (error) {
      console.error('포인트 만료 처리 오류:', error);
      return NextResponse.json(
        { error: error.message || '포인트 만료 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 결과 반환
    const result = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    return NextResponse.json({
      success: true,
      expiredCount: result?.expired_count || 0,
      message: result?.message || '만료된 포인트가 없습니다.'
    });
  } catch (error: any) {
    console.error('포인트 만료 API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 만료 예정 포인트 통계 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30'); // 기본 30일

    // 만료 예정 포인트 조회
    const { data: expiringPoints, error } = await supabaseAdmin
      .from('point_transactions')
      .select(`
        id,
        user_id,
        amount,
        expires_at,
        created_at,
        user:users!point_transactions_user_id_fkey(id, name, email)
      `)
      .eq('type', 'EARNED')
      .eq('expired', false)
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
      .order('expires_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('만료 예정 포인트 조회 오류:', error);
      return NextResponse.json(
        { error: error.message || '만료 예정 포인트 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 통계 계산
    const totalExpiring = expiringPoints?.reduce((sum, pt) => sum + (pt.amount || 0), 0) || 0;
    const expiringToday = expiringPoints?.filter(
      pt => pt.expires_at && new Date(pt.expires_at) <= new Date()
    ).reduce((sum, pt) => sum + (pt.amount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalExpiring,
        expiringToday,
        expiringCount: expiringPoints?.length || 0,
        days
      },
      points: expiringPoints || []
    });
  } catch (error: any) {
    console.error('만료 예정 포인트 조회 API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

