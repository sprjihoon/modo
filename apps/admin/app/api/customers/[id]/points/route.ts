import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 포인트 지급/차감 API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;
    const body = await request.json();
    const { amount, type, description, adminUserId } = body;

    // 입력 검증
    if (!amount || amount === 0) {
      return NextResponse.json(
        { error: '포인트 금액을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!type || !['ADMIN_ADD', 'ADMIN_SUB'].includes(type)) {
      return NextResponse.json(
        { error: '올바른 거래 유형을 선택해주세요.' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: '사유를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인
    console.log('👤 [Points API] 사용자 조회 시작:', userId);
    
    // .single() 대신 .maybeSingle() 사용 (결과가 0개일 수 있음)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, point_balance')
      .eq('id', userId)
      .maybeSingle();

    console.log('👤 [Points API] 조회 결과:', { user, userError });

    if (userError) {
      console.error('❌ [Points API] DB 조회 오류:', { userId, userError });
      return NextResponse.json(
        { 
          error: 'DB 조회 중 오류가 발생했습니다.',
          details: `User ID: ${userId}`,
          dbError: userError?.message 
        },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('❌ [Points API] 사용자를 찾을 수 없음:', userId);
      
      // 사용자가 없으면 users 테이블에 실제로 존재하는지 확인
      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId);
      
      console.log('👤 [Points API] 사용자 수 확인:', count);
      
      return NextResponse.json(
        { 
          error: '사용자를 찾을 수 없습니다.',
          details: `User ID: ${userId} (DB에 ${count}개 존재)`,
          suggestion: 'RLS 정책으로 인해 접근이 차단되었을 수 있습니다. service_role 키를 사용하고 있는지 확인하세요.'
        },
        { status: 404 }
      );
    }

    // 차감 시 잔액 확인
    if (type === 'ADMIN_SUB' && user.point_balance < Math.abs(amount)) {
      return NextResponse.json(
        { 
          error: `포인트 잔액이 부족합니다. (현재 잔액: ${user.point_balance}P)` 
        },
        { status: 400 }
      );
    }

    // 포인트 지급/차감 함수 호출
    const { data, error } = await supabaseAdmin.rpc('manage_user_points', {
      p_user_id: userId,
      p_amount: Math.abs(amount),
      p_type: type,
      p_description: description,
      p_order_id: undefined,
      p_admin_user_id: adminUserId || undefined,
      p_expires_at: undefined
    });

    if (error) {
      console.error('포인트 처리 오류:', error);
      return NextResponse.json(
        { error: error.message || '포인트 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 업데이트된 사용자 정보 조회
    const { data: updatedUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, name, point_balance, total_earned_points, total_used_points')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('사용자 정보 조회 오류:', fetchError);
    }

    return NextResponse.json({
      success: true,
      message: type === 'ADMIN_ADD' 
        ? `${Math.abs(amount)}P가 지급되었습니다.`
        : `${Math.abs(amount)}P가 차감되었습니다.`,
      transactionId: data,
      user: updatedUser
    });

  } catch (error) {
    console.error('포인트 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 포인트 거래 내역 조회 API
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 포인트 거래 내역 조회
    const { data: transactions, error } = await supabaseAdmin
      .from('point_transactions')
      .select(`
        *,
        order:orders(id, item_name, total_price),
        admin:admin_user_id(name, email)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('포인트 내역 조회 오류:', error);
      return NextResponse.json(
        { error: '포인트 내역 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 총 개수 조회
    const { count, error: countError } = await supabaseAdmin
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('포인트 내역 카운트 오류:', countError);
    }

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('포인트 내역 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

