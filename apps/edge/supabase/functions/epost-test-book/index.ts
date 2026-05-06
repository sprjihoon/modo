/**
 * 우체국 자유 수거/발송 테스트 API (관리자 전용)
 * POST /epost-test-book
 *
 * 기존 shipments-book 과는 완전히 분리된 테스트 전용 함수.
 * 임의의 보내는 주소 → 받는 주소로 우체국 API를 호출하여 수거/발송 송장을 발행한다.
 * 결과는 epost_test_logs 테이블에 저장된다.
 *
 * ⚠️ 주의: 실제 우체국 API를 호출하므로 실제 수거기사가 출동한다.
 *         반드시 의도한 주소인지 확인 후 호출할 것.
 */

import { handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { insertOrder, getApprovalNumber, type InsertOrderParams } from '../_shared/epost/index.ts';

interface EpostTestBookRequest {
  // 보내는 사람
  sender_name: string;
  sender_zipcode: string;
  sender_address: string;
  sender_address_detail?: string;
  sender_phone: string;

  // 받는 사람
  receiver_name: string;
  receiver_zipcode: string;
  receiver_address: string;
  receiver_address_detail?: string;
  receiver_phone: string;

  // 소포 옵션
  shipment_type?: 'pickup' | 'delivery'; // 기본값 pickup (반품소포, 착불)
  goods_name?: string;
  weight?: number;  // kg
  volume?: number;  // cm (가로+세로+높이)
  micro_yn?: 'Y' | 'N';     // 초소형 여부 (우체국 microYn)
  size_preset?: string;     // UI 프리셋 식별자 (custom/micro/small/medium/large/xlarge)
  delivery_message?: string;
  office_ser?: string;       // 공급지 코드 (선택)
  appr_no?: string;          // 승인번호 (선택)
  note?: string;             // 메모

  // 인증된 사용자 ID (선택, 로그용)
  created_by?: string;
}

const ZIPCODE_REGEX = /^\d{5}$/;

function cleanZipcode(zip: string): string {
  return (zip || '').toString().replace(/[-\s]/g, '').trim();
}

function cleanPhone(phone: string): string {
  return (phone || '').toString().replace(/-/g, '').substring(0, 12);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body: EpostTestBookRequest = await req.json();

    const {
      sender_name,
      sender_zipcode,
      sender_address,
      sender_address_detail,
      sender_phone,
      receiver_name,
      receiver_zipcode,
      receiver_address,
      receiver_address_detail,
      receiver_phone,
      shipment_type = 'pickup',
      goods_name,
      weight,
      volume,
      micro_yn,
      size_preset,
      delivery_message,
      office_ser,
      appr_no,
      note,
      created_by,
    } = body;

    // 1) 필수 필드 검증
    const missing: string[] = [];
    if (!sender_name) missing.push('sender_name');
    if (!sender_zipcode) missing.push('sender_zipcode');
    if (!sender_address) missing.push('sender_address');
    if (!sender_phone) missing.push('sender_phone');
    if (!receiver_name) missing.push('receiver_name');
    if (!receiver_zipcode) missing.push('receiver_zipcode');
    if (!receiver_address) missing.push('receiver_address');
    if (!receiver_phone) missing.push('receiver_phone');

    if (missing.length > 0) {
      return errorResponse(
        `필수 필드 누락: ${missing.join(', ')}`,
        400,
        'MISSING_FIELDS'
      );
    }

    const senderZip = cleanZipcode(sender_zipcode);
    const receiverZip = cleanZipcode(receiver_zipcode);

    if (!ZIPCODE_REGEX.test(senderZip)) {
      return errorResponse(
        `보내는 사람 우편번호 형식 오류: ${sender_zipcode} (5자리 숫자)`,
        400,
        'INVALID_ZIPCODE'
      );
    }
    if (!ZIPCODE_REGEX.test(receiverZip)) {
      return errorResponse(
        `받는 사람 우편번호 형식 오류: ${receiver_zipcode} (5자리 숫자)`,
        400,
        'INVALID_ZIPCODE'
      );
    }

    // 동일 주소 검증 (테스트용이지만 우체국이 거부할 가능성 높으므로 경고)
    if (
      senderZip === receiverZip &&
      sender_address.replace(/\s/g, '') === receiver_address.replace(/\s/g, '')
    ) {
      return errorResponse(
        '보내는 사람과 받는 사람의 주소가 완전히 동일합니다. 다른 주소를 입력하세요.',
        400,
        'SAME_ADDRESS_ERROR'
      );
    }

    // 2) 환경변수 확인
    const custNoEnv = Deno.env.get('EPOST_CUSTOMER_ID');
    if (!custNoEnv || custNoEnv.trim() === '') {
      return errorResponse(
        'EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.',
        500,
        'MISSING_ENV'
      );
    }
    const custNo = custNoEnv.trim();

    const hasSecurityKey = !!Deno.env.get('EPOST_SECURITY_KEY');
    if (!hasSecurityKey) {
      return errorResponse(
        'EPOST_SECURITY_KEY 환경 변수가 설정되지 않았습니다. 실제 API 호출 불가.',
        500,
        'MISSING_ENV'
      );
    }

    // 3) 승인번호 결정
    let apprNo = appr_no || Deno.env.get('EPOST_APPROVAL_NO');
    if (!apprNo) {
      try {
        apprNo = await getApprovalNumber(custNo);
        console.log('✅ 계약 승인번호 조회 성공:', apprNo);
      } catch (e) {
        console.error('❌ 계약 승인번호 조회 실패, 기본값 사용:', e);
        apprNo = '0000000000';
      }
    }

    // 4) 우체국 파라미터 구성
    const isPickup = shipment_type === 'pickup';
    const orderNo = `TEST${Date.now().toString().slice(-10)}`; // 테스트용 짧은 주문번호

    // ord* = 받는 사람 (수거: 센터/회수자, 발송: 보내는 곳)
    // rec* = 출발/도착 (반품소포/일반소포)
    // 우체국 매뉴얼 기준:
    //   반품소포(pickup, payType=2 착불): ord*=수취인(우리쪽), rec*=출발지(고객)
    //   일반소포(delivery, payType=1 선불): ord*=출발지(우리쪽), rec*=수취인(고객)
    //
    // 테스트에서는 자유롭게 보내는/받는 사람 매핑:
    //   pickup  → ord*=받는사람(receiver),  rec*=보내는사람(sender)
    //   delivery→ ord*=보내는사람(sender),  rec*=받는사람(receiver)

    const epostParams: InsertOrderParams = {
      custNo,
      apprNo: apprNo!,
      payType: isPickup ? '2' : '1',
      reqType: isPickup ? '2' : '1',
      officeSer: office_ser || Deno.env.get('EPOST_OFFICE_SER') || '251132110',
      orderNo,

      ...(isPickup
        ? {
            // 반품소포 (착불, 7로 시작) - ord=받는곳, rec=보내는곳
            ordCompNm: receiver_name,
            ordNm: receiver_name,
            ordZip: receiverZip,
            ordAddr1: receiver_address,
            ordAddr2: (receiver_address_detail && receiver_address_detail.trim()) || '없음',
            ordMob: cleanPhone(receiver_phone),

            recNm: sender_name,
            recZip: senderZip,
            recAddr1: sender_address,
            recAddr2: (sender_address_detail && sender_address_detail.trim()) || '',
            recTel: cleanPhone(sender_phone),
          }
        : {
            // 일반소포 (선불, 6으로 시작) - ord=보내는곳, rec=받는곳
            ordCompNm: sender_name,
            ordNm: sender_name,
            ordZip: senderZip,
            ordAddr1: sender_address,
            ordAddr2: (sender_address_detail && sender_address_detail.trim()) || '없음',
            ordMob: cleanPhone(sender_phone),

            recNm: receiver_name,
            recZip: receiverZip,
            recAddr1: receiver_address,
            recAddr2: (receiver_address_detail && receiver_address_detail.trim()) || '',
            recTel: cleanPhone(receiver_phone),
          }),

      contCd: '025',
      goodsNm: goods_name || '의류 수선 (테스트)',
      weight: typeof weight === 'number' && weight > 0 ? Math.floor(weight) : 2,
      volume: typeof volume === 'number' && volume > 0 ? Math.floor(volume) : 60,
      microYn: micro_yn === 'Y' ? 'Y' : 'N',
      delivMsg: delivery_message,
      testYn: 'N', // ⚠️ 실제 호출
      printYn: 'Y',
      inqTelCn: isPickup ? cleanPhone(receiver_phone) : cleanPhone(sender_phone),
    };

    console.log('🚀 [epost-test-book] 우체국 API 호출:', {
      orderNo,
      shipment_type,
      payType: epostParams.payType,
      reqType: epostParams.reqType,
      ord: { name: epostParams.ordNm, zip: epostParams.ordZip, addr: epostParams.ordAddr1 },
      rec: { name: epostParams.recNm, zip: epostParams.recZip, addr: epostParams.recAddr1 },
    });

    const supabase = createSupabaseClient(req);

    // 5) 우체국 API 호출
    let epostResponse;
    try {
      epostResponse = await insertOrder(epostParams);
      console.log('✅ [epost-test-book] 응답:', epostResponse);
    } catch (apiError: any) {
      console.error('❌ [epost-test-book] 우체국 API 실패:', apiError);

      // 실패도 로그로 저장
      await supabase.from('epost_test_logs').insert({
        created_by: created_by || null,
        sender_name,
        sender_zipcode: senderZip,
        sender_address,
        sender_address_detail: sender_address_detail || null,
        sender_phone: cleanPhone(sender_phone),
        receiver_name,
        receiver_zipcode: receiverZip,
        receiver_address,
        receiver_address_detail: receiver_address_detail || null,
        receiver_phone: cleanPhone(receiver_phone),
        shipment_type,
        pay_type: epostParams.payType,
        goods_name: epostParams.goodsNm,
        weight_kg: epostParams.weight,
        volume_cm: epostParams.volume,
        micro_yn: epostParams.microYn,
        size_preset: size_preset || null,
        delivery_message: delivery_message || null,
        status: 'BOOK_FAILED',
        appr_no: apprNo,
        req_type: epostParams.reqType,
        raw_request: epostParams as any,
        raw_response: { error: apiError?.message || String(apiError) } as any,
        note: note || null,
      });

      return errorResponse(
        `우체국 API 호출 실패: ${apiError?.message || String(apiError)}`,
        500,
        'EPOST_API_ERROR'
      );
    }

    // 6) DB 저장
    const { data: log, error: logError } = await supabase
      .from('epost_test_logs')
      .insert({
        created_by: created_by || null,
        sender_name,
        sender_zipcode: senderZip,
        sender_address,
        sender_address_detail: sender_address_detail || null,
        sender_phone: cleanPhone(sender_phone),
        receiver_name,
        receiver_zipcode: receiverZip,
        receiver_address,
        receiver_address_detail: receiver_address_detail || null,
        receiver_phone: cleanPhone(receiver_phone),
        shipment_type,
        pay_type: epostParams.payType,
        goods_name: epostParams.goodsNm,
        weight_kg: epostParams.weight,
        volume_cm: epostParams.volume,
        micro_yn: epostParams.microYn,
        size_preset: size_preset || null,
        delivery_message: delivery_message || null,
        status: 'BOOKED',
        tracking_no: epostResponse.regiNo,
        req_no: epostResponse.reqNo,
        res_no: epostResponse.resNo,
        appr_no: apprNo,
        req_type: epostParams.reqType,
        regi_po_nm: epostResponse.regiPoNm,
        res_date: epostResponse.resDate,
        price: epostResponse.price,
        raw_request: epostParams as any,
        raw_response: epostResponse as any,
        note: note || null,
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ epost_test_logs 저장 실패:', logError);
      // DB 저장 실패해도 우체국에는 등록되어 있으므로 응답에 포함
      return successResponse(
        {
          warning: 'DB 저장은 실패했지만 우체국에는 정상 등록되었습니다.',
          db_error: logError.message,
          tracking_no: epostResponse.regiNo,
          epost: epostResponse,
        },
        201
      );
    }

    return successResponse(
      {
        message: '테스트 송장 발행 완료 (실제 우체국 등록됨)',
        log,
        tracking_no: epostResponse.regiNo,
        epost: epostResponse,
      },
      201
    );
  } catch (error: any) {
    console.error('[epost-test-book] error:', error);
    return errorResponse(error?.message || 'Internal server error', 500);
  }
});
