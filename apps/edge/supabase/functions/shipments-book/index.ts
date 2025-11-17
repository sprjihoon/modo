/**
 * 수거예약 및 송장발급 API
 * POST /shipments-book
 * 
 * 우체국 API 연동하여 수거예약 + 송장 선발행
 * tracking_no를 생성하고 반환
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { insertOrder, mockInsertOrder, getApprovalNumber, type InsertOrderParams } from '../_shared/epost.ts';

interface ShipmentBookRequest {
  order_id: string;
  pickup_address_id?: string;   // 수거 배송지 ID (addresses 테이블)
  delivery_address_id?: string; // 배송 배송지 ID (addresses 테이블)
  pickup_address?: string;
  pickup_address_detail?: string;
  pickup_zipcode?: string;
  pickup_phone?: string;
  delivery_address?: string;
  delivery_address_detail?: string;
  delivery_zipcode?: string;
  delivery_phone?: string;
  customer_name: string;
  office_ser?: string;          // 공급지 코드 (기본값 사용)
  goods_name?: string;          // 상품명
  weight?: number;              // 중량(kg)
  volume?: number;              // 크기(cm)
  delivery_message?: string;    // 배송 메시지
  test_mode?: boolean;          // 테스트 모드
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 요청 본문 파싱
    const body: ShipmentBookRequest = await req.json();
    const { 
      order_id,
      pickup_address_id,
      delivery_address_id,
      pickup_address,
      pickup_address_detail,
      pickup_zipcode,
      pickup_phone,
      delivery_address,
      delivery_address_detail,
      delivery_zipcode,
      delivery_phone,
      customer_name,
      office_ser,
      goods_name,
      weight,
      volume,
      delivery_message,
      test_mode,
    } = body;

    // 필수 필드 검증
    if (!order_id || !customer_name) {
      return errorResponse('Missing required fields: order_id, customer_name', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 존재 여부 확인
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('id, tracking_no')
      .eq('id', order_id)
      .single();

    if (orderCheckError || !existingOrder) {
      return errorResponse('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // 이미 tracking_no가 있으면 중복 요청
    if (existingOrder.tracking_no) {
      return errorResponse('Shipment already booked', 400, 'ALREADY_BOOKED');
    }

    // addresses 테이블에서 주소 정보 가져오기
    let pickupInfo = {
      address: pickup_address || '',
      detail: pickup_address_detail || '',
      zipcode: pickup_zipcode || '',
      phone: pickup_phone || '',
    };
    
    let deliveryInfo = {
      address: delivery_address || '',
      detail: delivery_address_detail || '',
      zipcode: delivery_zipcode || '',
      phone: delivery_phone || '',
    };

    // address_id로 조회
    if (pickup_address_id) {
      const { data: pickupAddr } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', pickup_address_id)
        .single();
      
      if (pickupAddr) {
        pickupInfo = {
          address: pickupAddr.address,
          detail: pickupAddr.address_detail || '',
          zipcode: pickupAddr.zipcode,
          phone: pickupAddr.recipient_phone,
        };
      }
    }

    if (delivery_address_id) {
      const { data: deliveryAddr } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', delivery_address_id)
        .single();
      
      if (deliveryAddr) {
        deliveryInfo = {
          address: deliveryAddr.address,
          detail: deliveryAddr.address_detail || '',
          zipcode: deliveryAddr.zipcode,
          phone: deliveryAddr.recipient_phone,
        };
      }
    }

    // 주소 정보 검증
    if (!pickupInfo.address || !deliveryInfo.address) {
      return errorResponse('Pickup or delivery address is missing', 400, 'MISSING_ADDRESS');
    }

    // 우체국 소포신청 파라미터 구성
    const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || 'vovok1122';
    
    // 계약 승인번호 조회 (최초 1회)
    let apprNo = Deno.env.get('EPOST_APPROVAL_NO');
    if (!apprNo) {
      try {
        apprNo = await getApprovalNumber(custNo);
        console.log('✅ 계약 승인번호 조회 성공:', apprNo);
      } catch (e) {
        console.error('❌ 계약 승인번호 조회 실패:', e);
        // 승인번호를 못 가져오면 Mock 사용
        apprNo = '0000000000';
      }
    }

    const epostParams: InsertOrderParams = {
      custNo,
      apprNo,
      payType: '1',                           // 1: 선불 (기본값)
      reqType: '1',                           // 1: 일반소포
      officeSer: office_ser || Deno.env.get('EPOST_OFFICE_SER') || '251132110', // 공급지 코드
      orderNo: order_id,                      // 주문 ID를 주문번호로 사용
      
      // 수취인 정보
      recNm: customer_name,
      recZip: deliveryInfo.zipcode,
      recAddr1: deliveryInfo.address,
      recAddr2: deliveryInfo.detail,
      recTel: deliveryInfo.phone.replace(/-/g, '').substring(0, 12),
      
      // 상품 정보
      contCd: '025',                          // 025: 의류/패션잡화
      goodsNm: goods_name || '의류 수선',
      
      // 선택사항
      weight: weight || 2,
      volume: volume || 60,
      microYn: 'N',
      ordCompNm: '모두의수선',
      delivMsg: delivery_message,
      testYn: test_mode ? 'Y' : 'N',
      printYn: 'Y',
      inqTelCn: '1588-1300',                  // 고객센터 번호
    };

    console.log('📦 우체국 소포신청 요청:', {
      orderNo: epostParams.orderNo,
      recNm: epostParams.recNm,
      recZip: epostParams.recZip,
      testYn: epostParams.testYn,
    });

    // 우체국 API 호출
    let epostResponse;
    try {
      if (test_mode || !Deno.env.get('EPOST_SECURITY_KEY')) {
        console.log('⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용');
        epostResponse = await mockInsertOrder(epostParams);
      } else {
        console.log('🚀 실제 우체국 API 호출');
        epostResponse = await insertOrder(epostParams);
      }
    } catch (apiError) {
      console.error('❌ 우체국 API 호출 실패:', apiError);
      return errorResponse(`EPost API failed: ${apiError.message}`, 500, 'EPOST_API_ERROR');
    }

    const pickupTrackingNo = epostResponse.regiNo;
    const labelUrl = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${pickupTrackingNo}`;
    const pickupDate = epostResponse.resDate.substring(0, 8); // YYYYMMDD

    // 송장 정보를 DB에 저장 (upsert)
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .upsert({
        order_id,
        tracking_no: pickupTrackingNo,        // 하위 호환성
        pickup_tracking_no: pickupTrackingNo, // 수거 송장번호 (regiNo)
        delivery_tracking_no: null,           // 발송은 나중에 출고 시 생성
        pickup_address_id: pickup_address_id || null,
        delivery_address_id: delivery_address_id || null,
        pickup_address: pickupInfo.address,
        pickup_address_detail: pickupInfo.detail,
        pickup_zipcode: pickupInfo.zipcode,
        pickup_phone: pickupInfo.phone,
        delivery_address: deliveryInfo.address,
        delivery_address_detail: deliveryInfo.detail,
        delivery_zipcode: deliveryInfo.zipcode,
        delivery_phone: deliveryInfo.phone,
        customer_name,
        status: 'BOOKED',
        carrier: 'EPOST',
        pickup_requested_at: new Date().toISOString(),
        // 우체국 응답 추가 정보
        tracking_events: [{
          timestamp: new Date().toISOString(),
          status: 'BOOKED',
          description: '수거예약 완료',
          location: epostResponse.regiPoNm,
          reqNo: epostResponse.reqNo,
          resNo: epostResponse.resNo,
        }],
      }, {
        onConflict: 'order_id',
      })
      .select()
      .single();

    if (shipmentError) {
      console.error('Shipment upsert error:', shipmentError);
      return errorResponse('Failed to create shipment', 500, 'DB_ERROR');
    }

    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        tracking_no: pickupTrackingNo, // 하위 호환성
        status: 'BOOKED',
      })
      .eq('id', order_id);

    if (orderError) {
      console.error('Order update error:', orderError);
      return errorResponse('Failed to update order', 500, 'DB_ERROR');
    }

    // 알림 생성 (선택사항)
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: shipment.order_id, // TODO: 실제 user_id 가져오기
        type: 'SHIPMENT_BOOKED',
        title: '수거예약 완료',
        body: `회수 송장번호 ${pickupTrackingNo}로 수거가 예약되었습니다.`,
        order_id,
        tracking_no: pickupTrackingNo,
      });

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
      // 알림 실패는 전체 프로세스를 중단하지 않음
    }

    // 성공 응답
    return successResponse(
      {
        tracking_no: pickupTrackingNo,        // 하위 호환성
        pickup_tracking_no: pickupTrackingNo, // 수거 송장번호 (regiNo)
        delivery_tracking_no: null,           // 발송은 나중에
        label_url: labelUrl,                  // 배송추적 URL
        status: 'BOOKED',
        message: '수거예약이 완료되었습니다',
        pickup_date: pickupDate,
        // 우체국 응답 정보
        epost: {
          reqNo: epostResponse.reqNo,         // 소포 주문번호
          resNo: epostResponse.resNo,         // 소포 예약번호
          regiNo: epostResponse.regiNo,       // 운송장번호(등기번호)
          regiPoNm: epostResponse.regiPoNm,   // 접수 우체국명
          resDate: epostResponse.resDate,     // 예약 일시
          price: epostResponse.price,         // 접수요금
          vTelNo: epostResponse.vTelNo,       // 가상 전화번호
        },
        shipment,
      },
      201
    );

  } catch (error) {
    console.error('Shipments book error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

