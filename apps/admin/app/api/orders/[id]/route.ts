import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    console.log('📦 [API] 주문 상세 조회:', orderId);

    // Get order with related data
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        promotion_codes:promotion_code_id (code, discount_type, discount_value)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('📦 [API] 주문 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Get shipment data
    const { data: shipment } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    // Get videos for this order
    const trackingNumbers = [
      order.id,
      order.tracking_no,
      shipment?.pickup_tracking_no,
      shipment?.delivery_tracking_no,
      shipment?.tracking_no,
    ].filter(Boolean);

    console.log('📹 [API] 영상 검색 키:', trackingNumbers);

    let videos: any[] = [];
    
    if (trackingNumbers.length > 0) {
      const { data: videoData, error: videoError } = await supabaseAdmin
        .from('media')
        .select('*')
        .in('final_waybill_no', trackingNumbers)
        .in('type', ['inbound_video', 'outbound_video'])
        .order('type')
        .order('sequence');

      if (videoError) {
        console.error('📹 [API] 영상 조회 실패:', videoError);
      } else {
        videos = videoData || [];
        console.log('📹 [API] 찾은 영상:', videos.length, '개');
      }
    }

    // user_id 자동 연결 로직
    let finalOrder = order;
    if (!order.user_id && order.customer_email) {
      console.log('🔗 [API] user_id 없음, 자동 연결 시도...', order.customer_email);
      
      // customer_email로 기존 사용자 찾기
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', order.customer_email)
        .maybeSingle();

      let userId: string | null = null;

      if (existingUser) {
        console.log('✅ [API] 기존 사용자 발견:', existingUser.id);
        userId = existingUser.id;
      } else {
        console.log('🆕 [API] 새 사용자 생성 시도...');
        
        // 새 사용자 생성
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            email: order.customer_email,
            name: order.customer_name || '고객',
            phone: order.customer_phone || '',
            point_balance: 0,
            total_earned_points: 0,
            total_used_points: 0,
            auth_id: null, // 게스트 사용자
          })
          .select('id')
          .single();

        if (!createError && newUser) {
          console.log('✅ [API] 새 사용자 생성 완료:', newUser.id);
          userId = newUser.id;
        } else {
          console.error('❌ [API] 사용자 생성 실패:', createError);
        }
      }

      // 주문에 user_id 연결
      if (userId) {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ user_id: userId })
          .eq('id', orderId);

        if (!updateError) {
          console.log('✅ [API] 주문에 user_id 연결 완료');
          finalOrder = { ...order, user_id: userId };
        } else {
          console.error('❌ [API] 주문 업데이트 실패:', updateError);
        }
      }
    } else if (order.user_id) {
      // user_id가 있지만 users 테이블에 없는 경우 체크
      const { data: userExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', order.user_id)
        .maybeSingle();

      if (!userExists && order.customer_email) {
        console.log('⚠️ [API] user_id는 있지만 users에 없음, 사용자 생성...');
        
        // user_id를 유지하면서 사용자 생성
        const { error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: order.user_id, // 기존 UUID 사용
            email: order.customer_email,
            name: order.customer_name || '고객',
            phone: order.customer_phone || '',
            point_balance: 0,
            total_earned_points: 0,
            total_used_points: 0,
            auth_id: null,
          });

        if (!createError) {
          console.log('✅ [API] 기존 user_id로 사용자 생성 완료');
        } else {
          console.error('❌ [API] 사용자 생성 실패:', createError);
        }
      }
    }

    console.log('📦 [API] 주문 조회 성공:', {
      orderId: finalOrder.id,
      userId: finalOrder.user_id,
      trackingNo: finalOrder.tracking_no,
      shipment: shipment?.pickup_tracking_no,
      videos: videos?.length || 0
    });

    return NextResponse.json({
      success: true,
      order: {
        ...finalOrder,
        shipment,
        videos: videos || []
      }
    });
  } catch (error: any) {
    console.error('📦 [API] 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

