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
import { insertOrder, mockInsertOrder, getApprovalNumber, type InsertOrderParams } from '../_shared/epost/index.ts';

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

    // 센터(도착지) 기본 정보 - 환경변수 우선, 없으면 하드코딩된 기본값 사용
    const CENTER_FORCE = (Deno.env.get('CENTER_FORCE') || 'true').toLowerCase() === 'true';
    const CENTER_RECIPIENT_NAME = Deno.env.get('CENTER_RECIPIENT_NAME') || '모두의수선';
    const CENTER_ZIPCODE = Deno.env.get('CENTER_ZIPCODE') || '41142';
    const CENTER_ADDRESS1 = Deno.env.get('CENTER_ADDRESS1') || '대구광역시 동구 동촌로 1';
    const CENTER_ADDRESS2 = Deno.env.get('CENTER_ADDRESS2') || '동대구우체국 2층 소포실 모두의수선';
    const CENTER_PHONE = (Deno.env.get('CENTER_PHONE') || '01000000000').replace(/-/g, '').substring(0, 12);

    // 필수 필드 검증
    if (!order_id || !customer_name) {
      return errorResponse('Missing required fields: order_id, customer_name', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 존재 여부 확인 (user_id도 함께 가져오기)
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('id, tracking_no, user_id')
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

    // 주소 정보 검증 및 기본값/센터 강제 설정
    // 1) 픽업 주소가 비어 있으면 간단한 기본값 보강 (사용자 입력이 필수인 영역이라 최대한 그대로 둠)
    if (!pickupInfo.address) {
      pickupInfo = {
        address: pickupInfo.address || '고객 수거지 주소 미입력',
        detail: pickupInfo.detail || '',
        zipcode: pickupInfo.zipcode || '',
        phone: pickupInfo.phone || '01000000000',
      };
    }

    // 2) 도착지는 기본적으로 "센터 주소"를 사용 (DB에 설정되어 있으면 DB 우선)
    if (CENTER_FORCE || !deliveryInfo.address) {
      // DB에서 ops_center_settings 조회 (있으면 사용)
      try {
        const { data: centerRow } = await supabase
          .from('ops_center_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        if (centerRow) {
          deliveryInfo = {
            address: centerRow.address1 || CENTER_ADDRESS1,
            detail: centerRow.address2 || CENTER_ADDRESS2,
            zipcode: centerRow.zipcode || CENTER_ZIPCODE,
            phone: (centerRow.phone || CENTER_PHONE).toString(),
          };
        } else {
          deliveryInfo = {
            address: CENTER_ADDRESS1,
            detail: CENTER_ADDRESS2,
            zipcode: CENTER_ZIPCODE,
            phone: CENTER_PHONE,
          };
        }
      } catch (_) {
        deliveryInfo = {
          address: CENTER_ADDRESS1,
          detail: CENTER_ADDRESS2,
          zipcode: CENTER_ZIPCODE,
          phone: CENTER_PHONE,
        };
      }
    }

    // 필수 필드 검증: 우편번호는 필수
    if (!deliveryInfo.zipcode || deliveryInfo.zipcode.trim() === '') {
      console.error('❌ 배송지 우편번호가 없습니다:', {
        delivery_zipcode,
        delivery_address_id,
        deliveryInfo,
      });
      return errorResponse('배송지 우편번호(delivery_zipcode)가 필수입니다. 주소 정보를 확인하세요.', 400, 'MISSING_ZIPCODE');
    }

    // 우편번호 형식 검증 (5자리 숫자)
    const zipcodeRegex = /^\d{5}$/;
    const trimmedZipcode = deliveryInfo.zipcode.trim();
    if (!zipcodeRegex.test(trimmedZipcode)) {
      console.warn('⚠️ 우편번호 형식이 올바르지 않습니다:', trimmedZipcode);
      // 하이픈 제거 후 재확인
      const cleanedZipcode = trimmedZipcode.replace(/[-\s]/g, '');
      if (zipcodeRegex.test(cleanedZipcode)) {
        deliveryInfo.zipcode = cleanedZipcode;
        console.log('✅ 우편번호 정리됨:', cleanedZipcode);
      } else {
        return errorResponse(`우편번호 형식이 올바르지 않습니다: ${trimmedZipcode} (5자리 숫자 필요)`, 400, 'INVALID_ZIPCODE');
      }
    } else {
      deliveryInfo.zipcode = trimmedZipcode;
    }

    console.log('✅ 배송지 정보 검증 완료:', {
      address: deliveryInfo.address,
      zipcode: deliveryInfo.zipcode,
      phone: deliveryInfo.phone,
    });

    // 우체국 소포신청 파라미터 구성
    const custNoEnv = Deno.env.get('EPOST_CUSTOMER_ID');
    if (!custNoEnv || custNoEnv.trim() === '') {
      console.error('❌ EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.');
      return errorResponse('EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다. Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정하세요.', 500, 'MISSING_ENV');
    }
    
    const custNo = custNoEnv.trim();
    console.log('🔍 고객번호 확인:', {
      custNo: custNo,
      custNoLength: custNo.length,
      hasWhitespace: custNo !== custNoEnv,
      envValue: custNoEnv, // 원본 값도 로그에 출력
      trimmedValue: custNo, // 공백 제거된 값
    });
    
    // 고객번호 형식 경고
    if (custNo === 'vovok1122') {
      console.warn('⚠️ 기본 테스트 고객번호를 사용 중입니다. 실제 우체국 API 계약 시 발급받은 고객번호로 변경하세요.');
    }
    
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

    // epostParams 생성
    // 참고: testYn은 실제 API 호출 시 URL 파라미터로 사용되지만, regData에는 포함하지 않음
    const epostParams: InsertOrderParams = {
      custNo,
      apprNo,
      payType: '1',                           // 1: 선불 (기본값)
      reqType: '1',                           // 1: 일반소포
      officeSer: office_ser || Deno.env.get('EPOST_OFFICE_SER') || '251132110', // 공급지 코드
      orderNo: order_id,                      // 주문 ID를 주문번호로 사용
      
      // 수취인 정보
      recNm: customer_name || CENTER_RECIPIENT_NAME,
      recZip: deliveryInfo.zipcode.trim(), // 우편번호 (필수, 5자리 숫자)
      recAddr1: deliveryInfo.address,
      recAddr2: (deliveryInfo.detail && deliveryInfo.detail.trim() !== '') 
        ? deliveryInfo.detail.trim() 
        : '없음', // 상세주소가 없으면 "없음"으로 설정 (우체국 API 필수 항목)
      recTel: deliveryInfo.phone.replace(/-/g, '').substring(0, 12),
      
      // 상품 정보
      contCd: '025',                          // 025: 의류/패션잡화
      goodsNm: goods_name || '의류 수선',
      
      // 선택사항 (타입 명시적으로 변환)
      weight: typeof weight === 'number' ? weight : (typeof weight === 'string' ? parseFloat(weight) || 2 : 2),
      volume: typeof volume === 'number' ? volume : (typeof volume === 'string' ? parseFloat(volume) || 60 : 60),
      microYn: 'N' as const,
      ordCompNm: '모두의수선',
      delivMsg: delivery_message,
      testYn: (test_mode ? 'Y' : 'N') as const, // testYn은 URL 파라미터로 사용
      printYn: 'Y' as const,
      inqTelCn: '1588-1300',                  // 고객센터 번호
    };
    
    // 숫자 필드 최종 검증 및 정수 변환
    if (typeof epostParams.weight !== 'number' || isNaN(epostParams.weight) || epostParams.weight <= 0) {
      epostParams.weight = 2;
    } else {
      epostParams.weight = Math.floor(epostParams.weight);
    }
    
    if (typeof epostParams.volume !== 'number' || isNaN(epostParams.volume) || epostParams.volume <= 0) {
      epostParams.volume = 60;
    } else {
      epostParams.volume = Math.floor(epostParams.volume);
    }
    
    console.log('🔍 epostParams 검증 후:', {
      weight: epostParams.weight,
      volume: epostParams.volume,
      weightType: typeof epostParams.weight,
      volumeType: typeof epostParams.volume,
      testYn: epostParams.testYn,
      allKeys: Object.keys(epostParams),
    });

    console.log('📦 우체국 소포신청 요청:', {
      orderNo: epostParams.orderNo,
      recNm: epostParams.recNm,
      recZip: epostParams.recZip,
      recAddr1: epostParams.recAddr1,
      recTel: epostParams.recTel,
      // testYn 제외 (실제 API에서 사용 안 함)
      custNo: epostParams.custNo,
      apprNo: epostParams.apprNo,
      weight: epostParams.weight,
      volume: epostParams.volume,
    });

    // 우체국 API 호출
    let epostResponse;
    try {
      const hasSecurityKey = !!Deno.env.get('EPOST_SECURITY_KEY');
      const hasApiKey = !!Deno.env.get('EPOST_API_KEY');
      
      console.log('🔍 API 호출 모드 확인:', {
        test_mode,
        hasSecurityKey,
        hasApiKey,
        willUseMock: test_mode || !hasSecurityKey,
      });

      if (test_mode || !hasSecurityKey) {
        console.log('⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용');
        console.log('테스트 모드 파라미터:', JSON.stringify(epostParams, null, 2));
        epostResponse = await mockInsertOrder(epostParams);
        console.log('✅ Mock 응답:', JSON.stringify(epostResponse, null, 2));
      } else {
        console.log('🚀 실제 우체국 API 호출 시작');
        console.log('API 파라미터:', JSON.stringify(epostParams, null, 2));
        
        try {
          epostResponse = await insertOrder(epostParams);
          console.log('✅ 실제 API 응답:', JSON.stringify(epostResponse, null, 2));
        } catch (insertError) {
          console.error('❌ insertOrder 함수 실패:', {
            error: insertError,
            message: insertError?.message,
            stack: insertError?.stack,
          });
          throw insertError;
        }
      }
    } catch (apiError: any) {
      console.error('❌ 우체국 API 호출 실패 (상세):', {
        error: apiError,
        message: apiError?.message || '알 수 없는 오류',
        stack: apiError?.stack,
        name: apiError?.name,
        cause: apiError?.cause,
      });
      
      // 더 자세한 에러 메시지 제공
      const errorMessage = apiError?.message || '우체국 API 호출 중 오류가 발생했습니다';
      return errorResponse(`EPost API failed: ${errorMessage}`, 500, 'EPOST_API_ERROR');
    }

    const pickupTrackingNo = epostResponse.regiNo;
    const labelUrl = `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${pickupTrackingNo}`;
    const pickupDate = epostResponse.resDate.substring(0, 8); // YYYYMMDD

    // 송장 정보를 DB에 저장 (insert 또는 update)
    console.log('💾 shipments 테이블 저장 시도:', {
      order_id,
      tracking_no: pickupTrackingNo,
      customer_name,
      pickup_phone: pickupInfo.phone,
      delivery_phone: deliveryInfo.phone,
    });

    // 기존 shipment가 있는지 확인
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle();

    let shipment;
    let shipmentError;

    if (existingShipment) {
      // 업데이트
      const result = await supabase
        .from('shipments')
        .update({
          tracking_no: pickupTrackingNo,
          pickup_tracking_no: pickupTrackingNo,
          delivery_tracking_no: null,
          pickup_address: pickupInfo.address,
          pickup_address_detail: pickupInfo.detail || '',
          pickup_zipcode: pickupInfo.zipcode,
          pickup_phone: pickupInfo.phone,
          delivery_address: deliveryInfo.address,
          delivery_address_detail: deliveryInfo.detail || '',
          delivery_zipcode: deliveryInfo.zipcode,
          delivery_phone: deliveryInfo.phone,
          customer_name,
          status: 'BOOKED',
          carrier: 'EPOST',
          pickup_requested_at: new Date().toISOString(),
          tracking_events: [{
            timestamp: new Date().toISOString(),
            status: 'BOOKED',
            description: '수거예약 완료',
            location: epostResponse.regiPoNm,
            reqNo: epostResponse.reqNo,
            resNo: epostResponse.resNo,
            apprNo: epostParams.apprNo, // 취소 시 사용할 승인번호 저장
          }],
        })
        .eq('order_id', order_id)
        .select()
        .single();
      
      shipment = result.data;
      shipmentError = result.error;
    } else {
      // 신규 생성
      const result = await supabase
        .from('shipments')
        .insert({
          order_id,
          tracking_no: pickupTrackingNo,
          pickup_tracking_no: pickupTrackingNo,
          delivery_tracking_no: null,
          pickup_address: pickupInfo.address,
          pickup_address_detail: pickupInfo.detail || '',
          pickup_zipcode: pickupInfo.zipcode,
          pickup_phone: pickupInfo.phone,
          delivery_address: deliveryInfo.address,
          delivery_address_detail: deliveryInfo.detail || '',
          delivery_zipcode: deliveryInfo.zipcode,
          delivery_phone: deliveryInfo.phone,
          customer_name,
          status: 'BOOKED',
          carrier: 'EPOST',
          pickup_requested_at: new Date().toISOString(),
          tracking_events: [{
            timestamp: new Date().toISOString(),
            status: 'BOOKED',
            description: '수거예약 완료',
            location: epostResponse.regiPoNm,
            reqNo: epostResponse.reqNo,
            resNo: epostResponse.resNo,
            apprNo: epostParams.apprNo, // 취소 시 사용할 승인번호 저장
          }],
        })
        .select()
        .single();
      
      shipment = result.data;
      shipmentError = result.error;
    }

    if (shipmentError) {
      console.error('❌ Shipment 저장 실패:', {
        error: shipmentError,
        message: shipmentError.message,
        details: shipmentError.details,
        hint: shipmentError.hint,
        code: shipmentError.code,
      });
      return errorResponse(`Failed to create shipment: ${shipmentError.message}`, 500, 'DB_ERROR');
    }

    console.log('✅ Shipment 저장 성공:', shipment?.id);

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
    if (existingOrder?.user_id) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingOrder.user_id, // orders 테이블에서 가져온 user_id 사용
          type: 'SHIPMENT_BOOKED',
          title: '수거예약 완료',
          body: `회수 송장번호 ${pickupTrackingNo}로 수거가 예약되었습니다.`,
          order_id,
          tracking_no: pickupTrackingNo,
        });

      if (notificationError) {
        console.error('Notification insert error:', notificationError);
        // 알림 실패는 전체 프로세스를 중단하지 않음
      } else {
        console.log('✅ 알림 생성 성공');
      }
    } else {
      console.warn('⚠️ user_id가 없어 알림을 생성하지 않습니다.');
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

