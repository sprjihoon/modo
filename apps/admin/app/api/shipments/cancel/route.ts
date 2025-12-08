import { NextRequest, NextResponse } from 'next/server';

/**
 * 수거 취소 API
 * Edge Function의 shipments-cancel을 호출
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'order_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase Edge Function 호출
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/shipments-cancel`;

    console.log('🔄 수거 취소 요청:', { order_id, edgeFunctionUrl });

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        order_id,
        delete_after_cancel: false, // 취소만 하고 삭제하지 않음
      }),
    });

    const result = await response.json();

    console.log('✅ Edge Function 응답:', result);

    if (!response.ok) {
      throw new Error(result.error || '수거 취소에 실패했습니다.');
    }

    return NextResponse.json({
      success: true,
      message: result.message || '수거 예약이 취소되었습니다.',
      ...result,
    });
  } catch (error: any) {
    console.error('❌ 수거 취소 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '수거 취소 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

