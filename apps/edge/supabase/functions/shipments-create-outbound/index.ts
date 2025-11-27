/**
 * 출고 송장 생성 Edge Function
 * 
 * 입고 처리 후 고객에게 수선품을 발송하기 위한 출고 송장을 생성합니다.
 * 
 * POST /shipments-create-outbound
 * Body: { orderId: string }
 * Response: { trackingNo: string, ... }
 */

import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { insertOrder, getApprovalNumber, type InsertOrderParams } from '../_shared/epost/index.ts';

interface CreateOutboundRequest {
  orderId: string;
}

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabase = createSupabaseClient(req);
    const body: CreateOutboundRequest = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return errorResponse('orderId is required', 400);
    }

    console.log('📦 출고 송장 생성 시작:', orderId);

    // 1. 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return errorResponse('주문을 찾을 수 없습니다', 404);
    }

    // 2. shipments 정보 조회
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (shipmentError || !shipment) {
      return errorResponse('배송 정보를 찾을 수 없습니다', 404);
    }

    // 3. 센터 설정 조회 (발송지 정보)
    const { data: centerSettings } = await supabase
      .from('ops_center_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    // 기본 센터 정보
    const centerInfo = {
      name: centerSettings?.recipient_name || '모두의수선',
      zipcode: centerSettings?.zipcode || '41142',
      address1: centerSettings?.address1 || '대구광역시 동구 동촌로 1',
      address2: centerSettings?.address2 || '동대구우체국 2층 소포실 모두의수선',
      phone: centerSettings?.phone || '01027239490',
    };

    // 4. 고객번호 설정 (하드코딩)
    const custNo = '0005085217';
    console.log('🔑 고객번호 설정:', custNo);

    // 5. 계약 승인번호 조회
    const apprNo = await getApprovalNumber(custNo);

    // 6. 출고 송장 생성 파라미터 검증
    // 수취인 정보 (고객 배송지)
    const recNm = order.customer_name || '고객';
    const recZip = (order.delivery_zipcode || '').replace(/-/g, ''); // 하이픈 제거
    const recAddr1 = order.delivery_address || '';
    const recAddr2 = order.delivery_address_detail || '';
    const recMob = (order.customer_phone || order.delivery_phone || '').replace(/-/g, ''); // 하이픈 제거

    if (!recZip || !recAddr1 || !recMob) {
      return errorResponse('배송지 정보(우편번호, 주소, 연락처)가 누락되었습니다.', 400);
    }

    console.log('🔑 고객번호 확인:', { custNo, length: custNo.length });
    
    const outboundParams: InsertOrderParams = {
      custNo: custNo,
      apprNo,
      payType: '1', // 선불
      reqType: '1', // 일반소포
      officeSer: '251132110', // 공급지코드 (센터 우체국)
      orderNo: `OUT-${orderId.substring(0, 8)}-${Date.now()}`,
      
      // 수취인 정보 (고객 배송지)
      recNm,
      recZip,
      recAddr1,
      recAddr2,
      recMob,
      
      // 발송인 정보 (센터)
      ordCompNm: centerInfo.name,
      ordNm: centerInfo.name,
      ordZip: centerInfo.zipcode.replace(/-/g, ''),
      ordAddr1: centerInfo.address1,
      ordAddr2: centerInfo.address2,
      ordMob: centerInfo.phone.replace(/-/g, ''),
      
      // 상품 정보
      contCd: '025', // 의류/패션잡화
      goodsNm: order.item_name || `${order.clothing_type} ${order.repair_type}`,
      
      // 기타
      weight: 2,
      volume: 60,
      microYn: 'N',
      delivMsg: '수선 완료품입니다. 확인 부탁드립니다.',
      testYn: 'N', // 실제 운송장 발급
      printYn: 'Y', // 운송장 출력
    };

    console.log('📮 우체국 API 호출 (출고 송장):', outboundParams.orderNo);
    console.log('📋 파라미터 상세:', JSON.stringify(outboundParams, null, 2));

    // 6. 우체국 API 호출 (실제 API)
    let epostResult;
    try {
      epostResult = await insertOrder(outboundParams);
      console.log('✅ 출고 송장 생성 성공:', epostResult.regiNo);
      console.log('📋 응답 상세:', JSON.stringify(epostResult, null, 2));
    } catch (apiError: any) {
      console.error('❌ 우체국 API 호출 실패:', apiError);
      console.error('에러 상세:', apiError.message);
      
      // API 호출 실패 시에도 성공 응답(200)을 보내되, error 필드를 포함하여 클라이언트가 알 수 있게 함
      // 또는 500 에러를 던져서 클라이언트가 catch 하도록 함
      return errorResponse(`우체국 API 오류: ${apiError.message}`, 500);
    }

    if (!epostResult || !epostResult.regiNo) {
      console.error('❌ 우체국 API 응답에 운송장번호가 없습니다:', epostResult);
      return errorResponse('우체국 API 응답 오류 (운송장번호 없음)', 500);
    }

    // 7. shipments 테이블 업데이트
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        delivery_tracking_no: epostResult.regiNo,
        // API 응답 저장 (도착지 코드 등)
        delivery_info: epostResult,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('❌ shipments 업데이트 실패:', updateError);
      throw updateError;
    }

    return successResponse({
      trackingNo: epostResult.regiNo,
      reqNo: epostResult.reqNo,
      resNo: epostResult.resNo,
      price: epostResult.price,
      message: '출고 송장이 생성되었습니다',
    });
  } catch (error: any) {
    console.error('❌ 출고 송장 생성 실패:', error);
    return errorResponse(error.message || 'Failed to create outbound shipment', 500);
  }
});

