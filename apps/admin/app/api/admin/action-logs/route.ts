import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/action-logs
 * 직원 행동 분석 로그 조회 API (관리자 전용)
 * 
 * Query Parameters:
 * - limit: 조회할 로그 개수 (기본값: 100)
 * - actorId: 특정 사용자의 로그만 조회
 * - actionType: 특정 액션 타입의 로그만 조회
 * - startDate: 시작 날짜 (ISO 8601)
 * - endDate: 종료 날짜 (ISO 8601)
 * - actorRole: 특정 역할의 사용자 로그만 조회
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (userError || !userData || userData.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 3. 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const actorId = searchParams.get('actorId');
    const actionType = searchParams.get('actionType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const actorRole = searchParams.get('actorRole');

    // 4. 로그 조회 쿼리 빌드
    let query = supabase
      .from('action_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    // 필터 적용
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    if (actorRole) {
      query = query.eq('actor_role', actorRole);
    }
    if (startDate) {
      query = query.gte('timestamp', startDate);
    }
    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      throw logsError;
    }

    // 5. 응답 반환
    return NextResponse.json({
      success: true,
      data: logs || [],
      count: logs?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ 행동 분석 로그 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '로그 조회 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}

