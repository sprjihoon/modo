import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 주문에 사용자 연결하기
 * 1. customer_email로 기존 사용자 찾기
 * 2. 없으면 새 사용자 생성
 * 3. 주문에 user_id 연결
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    console.log('🔗 [Link User] 주문에 사용자 연결 시작:', orderId);

    // 1. 주문 정보 가져오기
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, customer_name, customer_email, customer_phone')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ [Link User] 주문 조회 실패:', orderError);
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // user_id가 이미 있으면 종료
    if (order.user_id) {
      console.log('✅ [Link User] 이미 user_id가 있습니다:', order.user_id);
      return NextResponse.json({
        success: true,
        message: '이미 사용자가 연결되어 있습니다.',
        userId: order.user_id,
        alreadyLinked: true,
      });
    }

    console.log('👤 [Link User] user_id 없음, 사용자 찾기/생성 시작');

    // 2. customer_email로 기존 사용자 찾기
    if (!order.customer_email) {
      return NextResponse.json({ success: false, error: '고객 이메일이 없습니다.' }, { status: 400 });
    }
    const { data: existingUser, error: findUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', order.customer_email)
      .maybeSingle();

    if (findUserError) {
      console.error('❌ [Link User] 사용자 조회 오류:', findUserError);
    }

    let userId: string;

    if (existingUser) {
      // 기존 사용자가 있음
      console.log('✅ [Link User] 기존 사용자 발견:', existingUser.id);
      userId = existingUser.id;
    } else {
      // 3. 새 사용자 생성
      console.log('🆕 [Link User] 새 사용자 생성 시작');
      
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          email: order.customer_email!,
          name: order.customer_name || order.customer_email!,
          phone: order.customer_phone,
          point_balance: 0,
          total_earned_points: 0,
          total_used_points: 0,
          // auth_id는 null (게스트 사용자)
        })
        .select('id')
        .single();

      if (createUserError || !newUser) {
        console.error('❌ [Link User] 사용자 생성 실패:', createUserError);
        return NextResponse.json(
          { 
            success: false, 
            error: '사용자 생성에 실패했습니다.',
            details: createUserError?.message 
          },
          { status: 500 }
        );
      }

      console.log('✅ [Link User] 새 사용자 생성 완료:', newUser.id);
      userId = newUser.id;
    }

    // 4. 주문에 user_id 연결
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ user_id: userId })
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ [Link User] 주문 업데이트 실패:', updateError);
      return NextResponse.json(
        { 
          success: false, 
          error: '주문에 사용자 연결 실패',
          details: updateError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ [Link User] 주문에 사용자 연결 완료');

    return NextResponse.json({
      success: true,
      message: existingUser 
        ? '기존 사용자를 주문에 연결했습니다.' 
        : '새 사용자를 생성하고 주문에 연결했습니다.',
      userId: userId,
      created: !existingUser,
    });

  } catch (error: any) {
    console.error('❌ [Link User] 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

