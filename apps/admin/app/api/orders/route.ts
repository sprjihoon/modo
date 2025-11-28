import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 관리자용 주문 조회 API
 * Service Role Key를 사용하여 RLS 우회, 모든 주문 조회 가능
 */
export async function GET() {
  try {
    // Service Role Key를 사용하여 모든 주문 조회 (RLS 우회)
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        promotion_codes:promotion_code_id (code, discount_type, discount_value)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('주문 조회 실패:', error);
      return NextResponse.json(
        { error: '주문 조회 실패', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

