import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;

    console.log('📦 [API] 주문 상세 조회:', orderId);

    const supabaseAdmin = getSupabaseAdmin();
    
    // Get order with related data (extra_charge 필드 명시적 포함)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id, user_id, order_number, status, clothing_type, repair_type, repair_parts, repair_detail,
        images, base_price, additional_price, total_price, created_at, updated_at, images_with_pins,
        promotion_code_id, promotion_discount_amount, original_total_price,
        customer_name, customer_email, customer_phone, item_name, item_description,
        pickup_address, pickup_address_detail, pickup_zipcode, pickup_phone,
        delivery_address, delivery_address_detail, delivery_zipcode, delivery_phone,
        notes, item_category, tracking_no, image_urls, payment_status, worker_id,
        extra_charge_status, extra_charge_data,
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
      // .in()을 두 번 연속 사용하면 문제가 발생하므로
      // 먼저 final_waybill_no로 필터링 후 JS에서 type 필터링
      const { data: videoData, error: videoError } = await supabaseAdmin
        .from('media')
        .select('*')
        .in('final_waybill_no', trackingNumbers)
        .order('type')
        .order('sequence');

      if (videoError) {
        console.error('📹 [API] 영상 조회 실패:', videoError);
      } else {
        // JavaScript에서 type 필터링
        videos = (videoData || []).filter(
          (v: any) => v.type === 'inbound_video' || v.type === 'outbound_video'
        );
        console.log('📹 [API] 찾은 영상:', videos.length, '개');
      }
    }

    // user_id 연결 상태 확인 (자동 생성 없이 로그만)
    // 주의: 자동 사용자 생성은 데이터 무결성 문제를 일으킬 수 있어 비활성화됨
    let finalOrder = order;
    if (!order.user_id && order.customer_email) {
      console.log('⚠️ [API] user_id 없는 주문:', orderId, '- email:', order.customer_email);
      
      // 기존 사용자가 있는지만 확인 (자동 연결은 하지 않음)
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', order.customer_email)
        .maybeSingle();

      if (existingUser) {
        console.log('ℹ️ [API] 동일 이메일 사용자 존재:', existingUser.id, '- 수동 연결 필요');
      } else {
        console.log('ℹ️ [API] 동일 이메일 사용자 없음 - 게스트 주문으로 처리');
      }
    } else if (order.user_id) {
      // user_id가 있지만 users 테이블에 없는 경우 로그만
      const { data: userExists } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', order.user_id)
        .maybeSingle();

      if (!userExists) {
        console.warn('⚠️ [API] user_id가 있지만 users 테이블에 없음:', order.user_id);
        // 자동 생성 없이 경고만 로그
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

