import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 포인트 거래 내역 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'ALL';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 기본 쿼리
    let query = supabaseAdmin
      .from('point_transactions')
      .select(`
        *,
        user:users!point_transactions_user_id_fkey(id, name, email),
        order:orders(id, item_name, total_price)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // 타입 필터
    if (type !== 'ALL') {
      const typeMap: Record<string, string[]> = {
        '적립': ['EARNED', 'ADMIN_ADD'],
        '사용': ['USED', 'ADMIN_SUB'],
        '만료': ['EXPIRED']
      };
      
      if (typeMap[type]) {
        query = query.in('type', typeMap[type]);
      }
    }

    // 검색 필터 (사용자명으로 검색)
    if (search) {
      // 먼저 사용자 검색
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('name', `%${search}%`);

      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        query = query.in('user_id', userIds);
      } else {
        // 검색 결과가 없으면 빈 결과 반환
        return NextResponse.json({
          transactions: [],
          total: 0,
          limit,
          offset
        });
      }
    }

    // 페이지네이션
    const { data: transactions, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('포인트 거래 내역 조회 오류:', error);
      return NextResponse.json(
        { error: '포인트 거래 내역 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 데이터 포맷팅
    const formattedTransactions = transactions?.map(transaction => {
      // 타입 한글 변환
      let typeKorean = '기타';
      if (transaction.type === 'EARNED') typeKorean = '적립';
      else if (transaction.type === 'USED') typeKorean = '사용';
      else if (transaction.type === 'ADMIN_ADD') typeKorean = '적립';
      else if (transaction.type === 'ADMIN_SUB') typeKorean = '차감';
      else if (transaction.type === 'EXPIRED') typeKorean = '만료';

      return {
        id: transaction.id,
        userId: transaction.user_id,
        userName: transaction.user?.name || '알 수 없음',
        type: typeKorean,
        amount: transaction.amount,
        description: transaction.description,
        orderId: transaction.order?.id || null,
        orderName: transaction.order?.item_name || null,
        createdAt: transaction.created_at,
      };
    }) || [];

    return NextResponse.json({
      transactions: formattedTransactions,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('포인트 거래 내역 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

