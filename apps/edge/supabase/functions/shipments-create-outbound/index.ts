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
import { insertOrder, getApprovalNumber, getDeliveryCode, type InsertOrderParams } from '../_shared/epost/index.ts';
import { lookupDeliveryCode } from '../_shared/epost/delivery-code-file-lookup.ts';
import { lookupDeliveryCodeFromDB } from '../_shared/epost/delivery-code-db-lookup.ts';

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

    // 1-1. 추가 결제 대기 여부 확인
    const { data: pendingAdditionalPayments } = await supabase
      .from('additional_payments')
      .select('id, amount, reason, status')
      .eq('order_id', orderId)
      .eq('status', 'PENDING');

    if (pendingAdditionalPayments && pendingAdditionalPayments.length > 0) {
      console.warn('⚠️ 추가 결제 대기 중:', pendingAdditionalPayments);
      return errorResponse(
        '추가 결제가 완료되지 않았습니다. 고객의 추가 결제가 완료된 후 출고할 수 있습니다.',
        400,
        'ADDITIONAL_PAYMENT_PENDING'
      );
    }

    // 1-2. 거부된 추가 결제 확인
    const { data: rejectedAdditionalPayments } = await supabase
      .from('additional_payments')
      .select('id, amount, reason, status')
      .eq('order_id', orderId)
      .eq('status', 'REJECTED');

    if (rejectedAdditionalPayments && rejectedAdditionalPayments.length > 0) {
      console.warn('⚠️ 추가 결제 거부됨:', rejectedAdditionalPayments);
      return errorResponse(
        '고객이 추가 결제를 거부했습니다. 주문을 취소하거나 초기 범위로 작업을 진행하세요.',
        400,
        'ADDITIONAL_PAYMENT_REJECTED'
      );
    }

    console.log('✅ 결제 상태 확인 완료 (추가 결제 없음 또는 모두 완료)');

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

    // 4. 고객번호 설정 (환경변수 우선, 없으면 기본값)
    const custNo = (Deno.env.get('EPOST_CUSTOMER_ID') || '0005085217').trim();
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
    
    // 🟩 규칙 2: 출고(Shipping) 라벨 생성일 때
    // Sender(보내는 사람) = 센터 주소
    // Receiver(받는 사람) = 고객 주소
    const isPickup = false;

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

    // 🎯 sender/receiver 디버그 로그 (Payload 전송 직전)
    // 개발환경(dev) 확인 - 여기선 단순히 로그를 찍음 (Supabase 로그에서 확인)
    console.log('🐛 [DEBUG] Label Creation Sender/Receiver Mapping (Shipping Rule 2):');
    console.log(`   isPickup: ${isPickup}`);
    console.log(`   Sender (Center): ${outboundParams.ordNm} / ${outboundParams.ordAddr1}`);
    console.log(`   Receiver (Customer): ${outboundParams.recNm} / ${outboundParams.recAddr1}`);

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

    // 6-1. 집배코드 조회 (배송지 우편번호로 상세 분류 코드 조회)
    let deliveryCodeInfo: any = {};
    if (order.delivery_zipcode) {
      try {
        console.log('🔍 집배코드 조회 시작, 우편번호:', order.delivery_zipcode);
        
        // 방법 1: Supabase DB 조회 (가장 정확, 34,396개 우편번호)
        const dbLookup = await lookupDeliveryCodeFromDB(supabase, order.delivery_zipcode);
        if (dbLookup) {
          deliveryCodeInfo = dbLookup;
          console.log('✅ 집배코드 DB 조회 성공:', deliveryCodeInfo);
        } else {
          // 방법 2: 로컬 매핑 조회 (fallback)
          console.log('⚠️ DB에 없음, 로컬 매핑 조회 시도...');
          const localLookup = lookupDeliveryCode(order.delivery_zipcode);
          if (localLookup) {
            deliveryCodeInfo = localLookup;
            console.log('✅ 집배코드 로컬 조회 성공:', deliveryCodeInfo);
          } else {
            // 방법 3: 우체국 API 조회 (최종 fallback)
            console.log('⚠️ 로컬 매핑에도 없음, 우체국 API 조회 시도...');
            const deliveryAddr = [
              order.delivery_address,
              order.delivery_address_detail,
            ].filter(Boolean).join(" ");
            deliveryCodeInfo = await getDeliveryCode({ 
              zipcode: order.delivery_zipcode,
              address: deliveryAddr 
            });
            console.log('✅ 집배코드 API 조회 성공:', deliveryCodeInfo);
          }
        }
      } catch (codeError: any) {
        console.warn('⚠️ 집배코드 조회 실패 (계속 진행):', codeError.message);
      }
    }

    // 7. delivery_info에 notifyMsg와 도서산간 정보 포함하여 저장
    // 도서산간 판단 로직
    let isIsland = false;
    
    // 1. 우체국 API의 islandAddFee 확인 (가장 정확)
    const islandAddFeeValue = epostResult.islandAddFee;
    if (islandAddFeeValue) {
      // 문자열이면 숫자로 변환, 숫자면 그대로 사용
      const fee = typeof islandAddFeeValue === 'string' 
        ? parseFloat(islandAddFeeValue.replace(/[^0-9.-]/g, '')) 
        : Number(islandAddFeeValue);
      isIsland = !isNaN(fee) && fee > 0;
    }
    
    // 2. 우편번호 기반 도서산간 지역 판단 (우체국 API 응답이 없을 때 대체 방법)
    if (!isIsland && order.delivery_zipcode) {
      const zipcode = order.delivery_zipcode.replace(/-/g, '').trim();
      if (zipcode.length >= 2) {
        const prefix = zipcode.substring(0, 2);
        // 제주도: 63xxx, 64xxx, 65xxx, 66xxx, 67xxx, 68xxx, 69xxx
        // 울릉도: 402xx
        const islandZipPrefixes = ['63', '64', '65', '66', '67', '68', '69']; // 제주도
        const islandZipPrefixes2 = ['402']; // 울릉도
        
        if (islandZipPrefixes.includes(prefix) || 
            islandZipPrefixes2.some(p => zipcode.startsWith(p))) {
          isIsland = true;
          console.log(`🏝️ 우편번호 기반 도서산간 판단: ${zipcode} (${order.delivery_address})`);
        }
      }
    }
    
    // 3. 주소 기반 판단 (최후의 수단)
    if (!isIsland && order.delivery_address) {
      const address = order.delivery_address.toLowerCase();
      const islandKeywords = ['제주', '울릉', '독도', '우도', '마라도', '비양도', '추자도', '가파도'];
      if (islandKeywords.some(keyword => address.includes(keyword))) {
        isIsland = true;
        console.log(`🏝️ 주소 기반 도서산간 판단: ${order.delivery_address}`);
      }
    }
    
    // 토요배송 휴무지역 알림 확인
    const isSaturdayClosed = epostResult.notifyMsg?.includes('토요배달') || 
                             epostResult.notifyMsg?.includes('토요배송') ||
                             epostResult.notifyMsg?.includes('토요');
    
    // 🗓️ 토요휴무지역 요일별 배송 안내 메시지 생성
    let saturdayClosedMessage = '';
    if (isSaturdayClosed) {
      const resDateStr = epostResult.resDate; // YYYYMMDDHHMMSS 형식
      if (resDateStr && resDateStr.length >= 8) {
        const resYear = parseInt(resDateStr.substring(0, 4));
        const resMonth = parseInt(resDateStr.substring(4, 6)) - 1;
        const resDay = parseInt(resDateStr.substring(6, 8));
        const resDateObj = new Date(resYear, resMonth, resDay);
        const dayOfWeek = resDateObj.getDay(); // 0:일, 1:월, ... 5:금, 6:토
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        
        // 배송 예약일 기준 안내
        if (dayOfWeek === 5) { // 금요일 배송 발송
          saturdayClosedMessage = '토요배송 휴무지역입니다. 금요일 발송 시 월요일에 배송됩니다.';
        } else if (dayOfWeek === 6) { // 토요일 배송 발송 (실제로는 발생하지 않을 수 있음)
          saturdayClosedMessage = '토요배송 휴무지역입니다. 월요일에 배송됩니다.';
        } else {
          // 일반 평일 발송
          const nextDay = (dayOfWeek + 1) % 7;
          const expectedDeliveryDay = nextDay === 0 ? '월요일' : nextDay === 6 ? '월요일' : `${dayNames[nextDay]}요일`;
          saturdayClosedMessage = `토요배송 휴무지역입니다. ${expectedDeliveryDay}에 배송 예정입니다.`;
        }
        
        console.log('🗓️ 토요휴무지역 배송 안내:', {
          resDate: resDateStr,
          dayOfWeek: dayNames[dayOfWeek],
          message: saturdayClosedMessage,
        });
      } else {
        saturdayClosedMessage = '토요배송 휴무지역입니다. 토요일에는 배송이 진행되지 않습니다.';
      }
    }
    
    const deliveryInfo: any = {
      ...epostResult,
      ...deliveryCodeInfo,
      notifyMsg: epostResult.notifyMsg || undefined,
      islandAddFee: epostResult.islandAddFee || undefined,
      isIsland: isIsland, // 도서산간 여부 (실제 부가이용료가 있을 때만 true)
      isSaturdayClosed: isSaturdayClosed, // 토요배송 휴무지역 여부
      saturdayClosedMessage: saturdayClosedMessage || undefined, // 토요휴무 안내 메시지
    };

    // 7. shipments 테이블 업데이트
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        delivery_tracking_no: epostResult.regiNo,
        delivery_info: deliveryInfo, // notifyMsg와 도서산간 정보 포함
        delivery_tracking_created_at: nowIso, // 출고 송장 생성 시각 기록
        updated_at: nowIso,
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

