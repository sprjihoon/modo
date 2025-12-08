import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * 송장 라벨 조회 API
 * 우체국 API에서 발급된 라벨 URL을 조회하거나 재발급합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingNo = searchParams.get('tracking_no');
    const orderId = searchParams.get('order_id');

    if (!trackingNo) {
      return NextResponse.json(
        { success: false, error: '운송장번호가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('📄 [Label API] 라벨 조회 요청:', { trackingNo, orderId });

    // shipments 테이블에서 라벨 정보 조회
    let query = supabaseAdmin
      .from('shipments')
      .select('*')
      .or(`pickup_tracking_no.eq.${trackingNo},delivery_tracking_no.eq.${trackingNo}`);

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: shipment, error } = await query.maybeSingle();

    if (error) {
      console.error('📄 [Label API] 조회 실패:', error);
      return NextResponse.json(
        { success: false, error: '라벨 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 라벨 URL이 있으면 반환
    if (shipment?.label_url) {
      return NextResponse.json({
        success: true,
        labelUrl: shipment.label_url,
        trackingNo: trackingNo,
        shipment: {
          id: shipment.id,
          order_id: shipment.order_id,
          pickup_tracking_no: shipment.pickup_tracking_no,
          delivery_tracking_no: shipment.delivery_tracking_no,
        }
      });
    }

    // 라벨 URL이 없으면 fallback (간이 라벨 사용)
    console.log('📄 [Label API] 라벨 URL 없음, 간이 라벨 사용');
    return NextResponse.json({
      success: true,
      labelUrl: null,
      trackingNo: trackingNo,
      message: '간이 라벨을 사용합니다.'
    });

  } catch (error: any) {
    console.error('📄 [Label API] 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

