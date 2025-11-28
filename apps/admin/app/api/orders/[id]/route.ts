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

    console.log('📦 [API] 주문 조회 성공:', {
      orderId: order.id,
      trackingNo: order.tracking_no,
      shipment: shipment?.pickup_tracking_no,
      videos: videos?.length || 0
    });

    return NextResponse.json({
      success: true,
      order: {
        ...order,
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

