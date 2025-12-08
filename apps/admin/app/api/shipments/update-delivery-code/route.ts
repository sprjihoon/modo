import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { lookupDeliveryCode } from '@/lib/delivery-code-lookup';

/**
 * 배송 송장의 집배코드 정보를 재조회하여 업데이트하는 API
 * POST /api/shipments/update-delivery-code
 * Body: { trackingNo: string, orderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingNo, orderId } = body;

    if (!trackingNo || !orderId) {
      return NextResponse.json(
        { success: false, error: 'trackingNo and orderId are required' },
        { status: 400 }
      );
    }

    console.log('🔍 [UpdateDeliveryCode] 집배코드 재조회 시작:', { trackingNo, orderId });

    // 1. 주문 정보 조회
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 2. shipment 정보 조회
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { success: false, error: '배송 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 3. 배송지 우편번호 확인
    const deliveryZipcode = order.delivery_zipcode;
    if (!deliveryZipcode) {
      return NextResponse.json(
        { success: false, error: '배송지 우편번호가 없습니다' },
        { status: 400 }
      );
    }

    console.log('📍 [UpdateDeliveryCode] 우편번호:', deliveryZipcode);

    // 4. 집배코드 조회
    let deliveryCodeInfo: any = null;
    
    try {
      // Supabase Edge Function 호출 (집배코드 조회)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      console.log('🔍 [UpdateDeliveryCode] Edge Function 호출...');
      const response = await fetch(`${supabaseUrl}/functions/v1/delivery-code-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ 
          zipcode: deliveryZipcode,
          address: order.delivery_address || ''
        }),
      });

      if (response.ok) {
        const result = await response.json();
        deliveryCodeInfo = result.data || result;
        console.log('✅ [UpdateDeliveryCode] 집배코드 조회 성공:', deliveryCodeInfo);
      } else {
        // Fallback: 로컬 매핑 조회
        console.log('⚠️ [UpdateDeliveryCode] Edge Function 실패, 로컬 조회 시도...');
        deliveryCodeInfo = lookupDeliveryCode(deliveryZipcode);
        
        if (!deliveryCodeInfo) {
          throw new Error('집배코드를 찾을 수 없습니다');
        }
        console.log('✅ [UpdateDeliveryCode] 로컬 조회 성공:', deliveryCodeInfo);
      }
    } catch (lookupError: any) {
      console.error('❌ [UpdateDeliveryCode] 집배코드 조회 실패:', lookupError);
      return NextResponse.json(
        { success: false, error: `집배코드 조회 실패: ${lookupError.message}` },
        { status: 500 }
      );
    }

    // 5. 기존 delivery_info와 병합
    let existingDeliveryInfo = shipment.delivery_info;
    if (typeof existingDeliveryInfo === 'string') {
      try {
        existingDeliveryInfo = JSON.parse(existingDeliveryInfo);
      } catch (e) {
        existingDeliveryInfo = {};
      }
    }

    const updatedDeliveryInfo = {
      ...existingDeliveryInfo,
      ...deliveryCodeInfo,
    };

    console.log('📦 [UpdateDeliveryCode] 업데이트할 delivery_info:', updatedDeliveryInfo);

    // 6. shipments 테이블 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({
        delivery_info: updatedDeliveryInfo,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('❌ [UpdateDeliveryCode] 업데이트 실패:', updateError);
      return NextResponse.json(
        { success: false, error: `업데이트 실패: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ [UpdateDeliveryCode] 집배코드 업데이트 완료');

    return NextResponse.json({
      success: true,
      message: '집배코드가 업데이트되었습니다',
      deliveryCodeInfo: updatedDeliveryInfo,
    });
  } catch (error: any) {
    console.error('❌ [UpdateDeliveryCode] 서버 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

