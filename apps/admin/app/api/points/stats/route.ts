import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 포인트 통계 조회
export async function GET(request: NextRequest) {
  try {
    // 전체 포인트 거래 내역 조회
    const { data: transactions, error } = await supabaseAdmin
      .from('point_transactions')
      .select('type, amount');

    if (error) {
      console.error('포인트 통계 조회 오류:', error);
      return NextResponse.json(
        { error: '포인트 통계 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 통계 계산
    let totalIssued = 0;
    let totalUsed = 0;
    let totalExpired = 0;

    transactions?.forEach(transaction => {
      if (transaction.type === 'EARNED' || transaction.type === 'ADMIN_ADD') {
        totalIssued += Math.abs(transaction.amount);
      } else if (transaction.type === 'USED' || transaction.type === 'ADMIN_SUB') {
        totalUsed += Math.abs(transaction.amount);
      } else if (transaction.type === 'EXPIRED') {
        totalExpired += Math.abs(transaction.amount);
      }
    });

    // 현재 보유 포인트 (모든 사용자의 포인트 잔액 합계)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('point_balance');

    if (usersError) {
      console.error('사용자 포인트 조회 오류:', usersError);
    }

    const totalHolding = users?.reduce((sum, user) => sum + (user.point_balance || 0), 0) || 0;

    return NextResponse.json({
      totalIssued,
      totalUsed,
      totalExpired,
      totalHolding,
    });

  } catch (error) {
    console.error('포인트 통계 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

