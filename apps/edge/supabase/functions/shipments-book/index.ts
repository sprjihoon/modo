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
import { insertOrder, mockInsertOrder, getApprovalNumber, getResInfo, type InsertOrderParams } from '../_shared/epost/index.ts';

interface ShipmentBookRequest {
  order_id: string;
  shipment_type?: 'pickup' | 'delivery'; // 'pickup': 수거(고객→센터), 'delivery': 발송(센터→고객), 기본값: 'pickup'
  use_separate_delivery_address?: boolean; // 명시적 플래그: 수거지와 배송지가 다른 경우 true
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
      shipment_type = 'pickup', // 기본값: 수거(반품소포)
      use_separate_delivery_address,
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

    // 명시적 플래그 로깅
    console.log('🔍 배송지 분리 플래그:', {
      use_separate_delivery_address,
      has_pickup_address_id: !!pickup_address_id,
      has_delivery_address_id: !!delivery_address_id,
      has_delivery_address: !!delivery_address,
    });

    // 센터(도착지) 기본 정보 - 환경변수 우선, 없으면 하드코딩된 기본값 사용
    const CENTER_FORCE = (Deno.env.get('CENTER_FORCE') || 'true').toLowerCase() === 'true';
    const CENTER_RECIPIENT_NAME = Deno.env.get('CENTER_RECIPIENT_NAME') || '모두의수선';
    const CENTER_ZIPCODE = Deno.env.get('CENTER_ZIPCODE') || '41142';
    const CENTER_ADDRESS1 = Deno.env.get('CENTER_ADDRESS1') || '대구광역시 동구 동촌로 1';
    const CENTER_ADDRESS2 = Deno.env.get('CENTER_ADDRESS2') || '동대구우체국 2층 소포실 모두의수선';
    const CENTER_PHONE = (Deno.env.get('CENTER_PHONE') || '01027239490').replace(/-/g, '').substring(0, 12);

    // 필수 필드 검증
    if (!order_id || !customer_name) {
      return errorResponse('Missing required fields: order_id, customer_name', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 존재 여부 확인 (user_id, order_number, 주소 정보 함께 가져오기)
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select(`
        id, 
        tracking_no, 
        user_id, 
        order_number,
        customer_name,
        pickup_address,
        pickup_address_detail,
        pickup_zipcode,
        pickup_phone,
        delivery_address,
        delivery_address_detail,
        delivery_zipcode,
        delivery_phone
      `)
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
    
    // 🚨 중요: DB에 저장된 주문 정보를 최우선으로 사용 (하드코딩 의심 해소 및 데이터 무결성 보장)
    if (existingOrder) {
      console.log('🔄 DB 주문 정보로 주소 정보 동기화 (orders 테이블 우선):', {
        order_number: existingOrder.order_number,
        pickup: existingOrder.pickup_address,
        delivery: existingOrder.delivery_address
      });

      // 수거지 정보 동기화 (DB 값 우선)
      if (existingOrder.pickup_address) {
        pickupInfo.address = existingOrder.pickup_address;
        pickupInfo.detail = existingOrder.pickup_address_detail || '';
        pickupInfo.zipcode = existingOrder.pickup_zipcode || '';
        pickupInfo.phone = existingOrder.pickup_phone || pickupInfo.phone;
      }
      
      // 배송지 정보 동기화 (DB 값 우선)
      // 단, CENTER_FORCE가 true이면 나중에 센터 주소로 덮어써질 수 있음
      if (existingOrder.delivery_address) {
        deliveryInfo.address = existingOrder.delivery_address;
        deliveryInfo.detail = existingOrder.delivery_address_detail || '';
        deliveryInfo.zipcode = existingOrder.delivery_zipcode || '';
        deliveryInfo.phone = existingOrder.delivery_phone || deliveryInfo.phone;
      }
    }

    console.log('🔍 주소 정보 (처리 전):', {
      pickupInfo_address: pickupInfo.address,
      pickupInfo_zipcode: pickupInfo.zipcode,
      deliveryInfo_address: deliveryInfo.address,
      deliveryInfo_zipcode: deliveryInfo.zipcode,
    });
    
    // 1) 픽업 주소가 비어 있으면 간단한 기본값 보강 (사용자 입력이 필수인 영역이라 최대한 그대로 둠)
    if (!pickupInfo.address) {
      console.warn('⚠️ pickupInfo.address가 비어있음! 기본값 설정');
      pickupInfo = {
        address: pickupInfo.address || '고객 수거지 주소 미입력',
        detail: pickupInfo.detail || '',
        zipcode: pickupInfo.zipcode || '',
        phone: pickupInfo.phone || '01000000000',
      };
    }
    
    console.log('🔍 픽업 주소 검증 후:', {
      pickupInfo_address: pickupInfo.address,
      pickupInfo_zipcode: pickupInfo.zipcode,
    });

    // 2) 🚨 중요: 수거 신청의 도착지는 항상 센터여야 함!
    // CENTER_FORCE 설정과 관계없이 무조건 센터 주소 사용
    // (반품소포 특성상 고객→센터 배송이므로 배송지는 항상 센터)
    console.log('🔒 수거 신청: 배송지를 센터 주소로 강제 설정 (CENTER_FORCE 무시)');
    
    // 사용자 입력 배송지가 있으면 경고 로그
    if (deliveryInfo.address && 
        !deliveryInfo.address.includes('모두의수선') && 
        !deliveryInfo.address.includes('동대구우체국')) {
      console.warn('⚠️ 사용자 입력 배송지가 무시되고 센터 주소로 강제됩니다:', {
        use_separate_delivery_address,
        userInputAddress: deliveryInfo.address,
        userInputZipcode: deliveryInfo.zipcode,
        reason: '수거 신청은 항상 센터가 배송지입니다 (반품소포)',
        note: '고객→센터 수거이므로 배송지는 무조건 센터',
      });
    }
    
    // 항상 센터 주소로 설정 (DB 우선, 없으면 환경변수/기본값)
    try {
      const { data: centerRow } = await supabase
        .from('ops_center_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (centerRow) {
        const centerPhone = centerRow.phone 
          ? centerRow.phone.toString().replace(/-/g, '').substring(0, 12)
          : CENTER_PHONE;
        console.log('📞 센터 전화번호 설정:', {
          dbPhone: centerRow.phone,
          envPhone: Deno.env.get('CENTER_PHONE'),
          finalPhone: centerPhone,
          source: centerRow.phone ? 'DB (ops_center_settings)' : Deno.env.get('CENTER_PHONE') ? '환경변수' : '기본값',
        });
        deliveryInfo = {
          address: centerRow.address1 || CENTER_ADDRESS1,
          detail: centerRow.address2 || CENTER_ADDRESS2,
          zipcode: centerRow.zipcode || CENTER_ZIPCODE,
          phone: centerPhone,
        };
        console.log('✅ 센터 주소(DB): ', deliveryInfo);
      } else {
        console.log('📞 센터 전화번호 설정:', {
          envPhone: Deno.env.get('CENTER_PHONE'),
          finalPhone: CENTER_PHONE,
          source: Deno.env.get('CENTER_PHONE') ? '환경변수' : '기본값',
        });
        deliveryInfo = {
          address: CENTER_ADDRESS1,
          detail: CENTER_ADDRESS2,
          zipcode: CENTER_ZIPCODE,
          phone: CENTER_PHONE,
        };
        console.log('✅ 센터 주소(기본값): ', deliveryInfo);
      }
    } catch (err) {
      console.warn('⚠️ ops_center_settings 조회 실패, 기본값 사용:', err);
      console.log('📞 센터 전화번호 설정:', {
        envPhone: Deno.env.get('CENTER_PHONE'),
        finalPhone: CENTER_PHONE,
        source: Deno.env.get('CENTER_PHONE') ? '환경변수' : '기본값',
      });
      deliveryInfo = {
        address: CENTER_ADDRESS1,
        detail: CENTER_ADDRESS2,
        zipcode: CENTER_ZIPCODE,
        phone: CENTER_PHONE,
      };
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

    console.log('✅ 배송지 정보 검증 완료 (센터 주소 강제 설정됨):', {
      address: deliveryInfo.address,
      zipcode: deliveryInfo.zipcode,
      phone: deliveryInfo.phone,
      isCenterAddress: true,
    });
    
    console.log('🔍 주소 비교 (수거지 vs 센터):', {
      pickup: {
        address: pickupInfo.address,
        zipcode: pickupInfo.zipcode,
      },
      delivery: {
        address: deliveryInfo.address,
        zipcode: deliveryInfo.zipcode,
      },
      note: '수거지와 센터 주소는 반드시 달라야 합니다',
    });

    // 🚨 중요: 수거지와 센터 주소가 같은지 검증
    // 같은 주소로 배송 요청하면 우체국에서 배송하지 않음
    const normalizeAddress = (addr: string) => addr.replace(/\s/g, '').toLowerCase();
    const pickupZip = pickupInfo.zipcode?.trim() || '';
    const centerZip = deliveryInfo.zipcode?.trim() || '';
    const pickupAddr = normalizeAddress(pickupInfo.address || '');
    const centerAddr = normalizeAddress(deliveryInfo.address || '');
    
    // 우편번호가 같고, 주소의 주요 부분(앞 20자)이 70% 이상 일치하면 같은 주소로 판단
    const isSameZipcode = pickupZip === centerZip && pickupZip.length === 5;
    const addressSimilarity = pickupAddr.substring(0, 20) === centerAddr.substring(0, 20);
    const isSameAddress = isSameZipcode && addressSimilarity;
    
    if (isSameAddress) {
      console.error('❌ 수거지와 센터 주소가 동일합니다:', {
        pickup: {
          address: pickupInfo.address,
          zipcode: pickupInfo.zipcode,
          detail: pickupInfo.detail,
        },
        center: {
          address: deliveryInfo.address,
          zipcode: deliveryInfo.zipcode,
          detail: deliveryInfo.detail,
        },
        comparison: {
          sameZipcode: isSameZipcode,
          addressSimilarity,
        }
      });
      
      return errorResponse(
        '❌ 수거지 주소가 센터 주소와 동일합니다.\n\n' +
        '우체국 택배는 같은 주소로 배송할 수 없습니다.\n' +
        '• 센터에 직접 방문하시거나\n' +
        '• 다른 주소로 수거 신청해주세요.\n\n' +
        `수거지: ${pickupInfo.address} (${pickupInfo.zipcode})\n` +
        `센터: ${deliveryInfo.address} (${deliveryInfo.zipcode})`,
        400,
        'SAME_ADDRESS_ERROR'
      );
    }
    
    console.log('✅ 수거지와 센터 주소 검증 완료 (서로 다름):', {
      pickupZipcode: pickupZip,
      centerZipcode: centerZip,
      different: !isSameAddress,
    });
    
    console.log('🔍 최종 주소 정보 (API 전달 직전):', {
      pickupInfo_FINAL: pickupInfo,
      deliveryInfo_FINAL: deliveryInfo,
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

    // ⚠️ 중요: test_mode 설정 확인
    // test_mode가 false이고 보안키가 있어야 실제 우체국 시스템에 등록됩니다.
    const hasSecurityKey = !!Deno.env.get('EPOST_SECURITY_KEY');
    const willUseRealAPI = !test_mode && hasSecurityKey;
    
    console.log('🔐 API 모드 확인:', {
      test_mode,
      hasSecurityKey,
      willUseRealAPI,
      warning: !willUseRealAPI 
        ? '⚠️ Mock 또는 테스트 모드입니다. 실제 수거예약이 등록되지 않습니다.'
        : '✅ 실제 우체국 API를 사용합니다. 수거예약이 등록됩니다.',
    });
    
    // epostParams 생성
    // 참고: testYn은 실제 API 호출 시 URL 파라미터로 사용되지만, regData에는 포함하지 않음
    
    // 🔍 수거예약일 설정 및 검증
    // 우체국 API는 resDate를 응답으로 반환하지만, 요청 시 날짜를 지정할 수 있는 파라미터가 있을 수 있습니다.
    // 현재는 우체국 API가 자동으로 설정하지만, 응답에서 받은 resDate를 확인하여 이상한 날짜인지 검증합니다.
    // 참고: 오늘 예약하면 보통 내일 픽업이 정상이며, 일요일은 픽업 안됨
    const today = new Date();
    const todayYmd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    // 내일 날짜 계산 (일요일 제외)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // 일요일이면 월요일로 변경 (일요일 = 0)
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    const tomorrowYmd = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    console.log('📅 날짜 정보:', {
      오늘: todayYmd,
      내일: tomorrowYmd,
      오늘요일: ['일', '월', '화', '수', '목', '금', '토'][today.getDay()],
      내일요일: ['일', '월', '화', '수', '목', '금', '토'][tomorrow.getDay()],
    });
    

    // 🔀 shipment_type에 따라 발송/수거 구분
    const isPickup = shipment_type === 'pickup'; // true: 수거, false: 발송
    const isDelivery = shipment_type === 'delivery';

    console.log('🚚 송장 유형:', {
      shipment_type,
      isPickup,
      isDelivery,
      description: isPickup ? '수거(고객→센터, 반품소포, 착불, 7로 시작)' : '발송(센터→고객, 일반소포, 선불, 6으로 시작)'
    });

    // 🚨 중요: 우체국 API 필드 매핑
    // 
    // 🔵 발송(delivery): 일반소포 (센터→고객)
    //   - payType='1' (선불, 센터가 신용으로 선불)
    //   - reqType='1' (일반소포)
    //   - ord* = 센터 (보내는 사람, 발송인)
    //   - rec* = 고객 (받는 사람, 수취인)
    //   - 송장번호: 6으로 시작
    // 
    // 🟠 수거(pickup): 반품소포 (고객→센터)
    //   - payType='2' (착불, 센터가 착불로 부담)
    //   - reqType='2' (반품소포)
    //   - ord* = 센터 (받는 사람, 반품받는 곳)
    //   - rec* = 고객 (보내는 사람, 반품 보내는 곳)
    //   - 송장번호: 7로 시작
    
    const epostParams: InsertOrderParams = {
      custNo,
      apprNo,
      payType: isPickup ? '2' : '1',           // pickup: 착불, delivery: 선불
      reqType: isPickup ? '2' : '1',           // pickup: 반품소포, delivery: 일반소포
      officeSer: office_ser || Deno.env.get('EPOST_OFFICE_SER') || '251132110', // 공급지 코드 (필수)
      orderNo: existingOrder.order_number || order_id, // 🚨 중요: 짧은 주문번호 사용 (DB 값)
      
      // 🔀 발송/수거에 따라 ord*/rec* 필드 매핑
      ...(isPickup ? {
        // 🟠 수거(Pickup): ord* = 센터, rec* = 고객
        ordCompNm: CENTER_RECIPIENT_NAME,
        ordNm: CENTER_RECIPIENT_NAME,
        ordZip: deliveryInfo.zipcode.trim(),
        ordAddr1: deliveryInfo.address,
        ordAddr2: (deliveryInfo.detail && deliveryInfo.detail.trim() !== '') 
          ? deliveryInfo.detail.trim() 
          : '없음',
        ordMob: deliveryInfo.phone.replace(/-/g, '').substring(0, 12),
        
        recNm: existingOrder.customer_name || customer_name,
        recZip: pickupInfo.zipcode ? pickupInfo.zipcode.trim().replace(/-/g, '') : '',
        recAddr1: pickupInfo.address || '고객 수거지 주소',
        recAddr2: (pickupInfo.detail && pickupInfo.detail.trim() !== '') 
          ? pickupInfo.detail.trim() 
          : '',
        recTel: pickupInfo.phone ? pickupInfo.phone.replace(/-/g, '').substring(0, 12) : '',
      } : {
        // 🔵 발송(Delivery): ord* = 센터, rec* = 고객
        ordCompNm: CENTER_RECIPIENT_NAME,
        ordNm: CENTER_RECIPIENT_NAME,
        ordZip: pickupInfo.zipcode.trim(), // 발송 시 센터 우편번호
        ordAddr1: pickupInfo.address || CENTER_ADDRESS1, // 발송 시 센터 주소
        ordAddr2: (pickupInfo.detail && pickupInfo.detail.trim() !== '') 
          ? pickupInfo.detail.trim() 
          : CENTER_ADDRESS2,
        ordMob: pickupInfo.phone ? pickupInfo.phone.replace(/-/g, '').substring(0, 12) : CENTER_PHONE,
        
        recNm: existingOrder.customer_name || customer_name,
        recZip: deliveryInfo.zipcode ? deliveryInfo.zipcode.trim().replace(/-/g, '') : '',
        recAddr1: deliveryInfo.address || '고객 배송지 주소',
        recAddr2: (deliveryInfo.detail && deliveryInfo.detail.trim() !== '') 
          ? deliveryInfo.detail.trim() 
          : '',
        recTel: deliveryInfo.phone ? deliveryInfo.phone.replace(/-/g, '').substring(0, 12) : '',
      }),
      
      // 상품 정보
      contCd: '025',                          // 025: 의류/패션잡화
      goodsNm: goods_name || '의류 수선',
      
      // 선택사항 (타입 명시적으로 변환)
      weight: typeof weight === 'number' ? weight : (typeof weight === 'string' ? parseFloat(weight) || 2 : 2),
      volume: typeof volume === 'number' ? volume : (typeof volume === 'string' ? parseFloat(volume) || 60 : 60),
      microYn: 'N' as const,
      delivMsg: delivery_message,
      testYn: (test_mode ? 'Y' : 'N') as const,
      printYn: 'Y' as const,
      inqTelCn: isPickup 
        ? (pickupInfo.phone ? pickupInfo.phone.replace(/-/g, '').substring(0, 12) : undefined)
        : CENTER_PHONE,
    };
    
    // 🎯 sender/receiver 디버그 로그 (Payload 전송 직전)
    if (isPickup) {
      console.log('🟠 [DEBUG] 수거 라벨 (반품소포) - 고객→센터');
      console.log(`   payType: 2 (착불), reqType: 2 (반품소포), 송장번호: 7로 시작`);
      console.log(`   📥 ord* = 센터 (도착지, 받는 사람): ${epostParams.ordNm} / ${epostParams.ordAddr1} (${epostParams.ordZip})`);
      console.log(`   📤 rec* = 고객 (출발지, 보내는 사람): ${epostParams.recNm} / ${epostParams.recAddr1} (${epostParams.recZip})`);
    } else {
      console.log('🔵 [DEBUG] 발송 라벨 (일반소포) - 센터→고객');
      console.log(`   payType: 1 (선불), reqType: 1 (일반소포), 송장번호: 6으로 시작`);
      console.log(`   📤 ord* = 센터 (출발지, 보내는 사람): ${epostParams.ordNm} / ${epostParams.ordAddr1} (${epostParams.ordZip})`);
      console.log(`   📥 rec* = 고객 (도착지, 받는 사람): ${epostParams.recNm} / ${epostParams.recAddr1} (${epostParams.recZip})`);
    }
    console.log(`   🔍 주소 비교:`, {
      ordAddr: epostParams.ordAddr1,
      recAddr: epostParams.recAddr1,
      ordZip: epostParams.ordZip,
      recZip: epostParams.recZip,
      isSame: epostParams.ordAddr1 === epostParams.recAddr1 && epostParams.ordZip === epostParams.recZip
    });
    
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

    console.log(`📦 우체국 소포신청 요청 (${isPickup ? '수거: 반품소포, 고객→센터' : '발송: 일반소포, 센터→고객'}):`, {
      orderNo: epostParams.orderNo,
      payType: isPickup ? '2 (착불)' : '1 (선불)',
      reqType: isPickup ? '2 (반품소포)' : '1 (일반소포)',
      송장번호_시작: isPickup ? '7' : '6',
      // ord* = 보내는 사람 또는 받는 사람 (pickup: 센터=받는사람, delivery: 센터=보내는사람)
      ord명: epostParams.ordNm,
      ord우편번호: epostParams.ordZip,
      ord주소: epostParams.ordAddr1,
      ord전화: epostParams.ordMob,
      // rec* = 받는 사람 또는 보내는 사람 (pickup: 고객=보내는사람, delivery: 고객=받는사람)
      rec명: epostParams.recNm,
      rec우편번호: epostParams.recZip,
      rec주소: epostParams.recAddr1,
      rec전화: epostParams.recTel,
      // 기타
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
        testYn: epostParams.testYn,
        warning: test_mode 
          ? '⚠️ 테스트 모드입니다. 실제 수거예약이 등록되지 않습니다.'
          : epostParams.testYn === 'N'
          ? '✅ testYn=N으로 설정되었습니다. 하지만 실제 수거예약이 등록되려면 우체국과의 계약이 완료되어야 합니다.'
          : '⚠️ testYn=Y로 설정되었습니다. 실제 수거예약이 등록되지 않습니다.',
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
          // 🔍 개발 체크: testYn 파라미터 확인
          console.log('🔍 개발 체크 - testYn 파라미터:', {
            test_mode,
            testYn: epostParams.testYn,
            expected: test_mode ? 'Y' : 'N',
            isCorrect: epostParams.testYn === (test_mode ? 'Y' : 'N'),
          });
          
          // 🔍 개발 체크: API 호출 전 파라미터 검증
          console.log('🔍 개발 체크 - API 호출 전 파라미터 검증:', {
            custNo: epostParams.custNo,
            apprNo: epostParams.apprNo,
            orderNo: epostParams.orderNo,
            recNm: epostParams.recNm,
            recZip: epostParams.recZip,
            recAddr1: epostParams.recAddr1,
            recTel: epostParams.recTel,
            testYn: epostParams.testYn,
            officeSer: epostParams.officeSer,
            weight: epostParams.weight,
            volume: epostParams.volume,
          });
          
          epostResponse = await insertOrder(epostParams);
          console.log('✅ 실제 API 응답:', JSON.stringify(epostResponse, null, 2));
          
          // 🔍 개발 체크: API 응답 검증 및 예약일시 확인
          const resDateYmd = epostResponse.resDate ? epostResponse.resDate.substring(0, 8) : '';
          const resDateObj = resDateYmd ? new Date(
            parseInt(resDateYmd.substring(0, 4)),
            parseInt(resDateYmd.substring(4, 6)) - 1,
            parseInt(resDateYmd.substring(6, 8))
          ) : null;
          const resDateDayOfWeek = resDateObj ? resDateObj.getDay() : null;
          const resDateDayName = resDateDayOfWeek !== null ? ['일', '월', '화', '수', '목', '금', '토'][resDateDayOfWeek] : null;
          
          // 예약일시 검증: 내일부터 가능하며, 일요일은 제외
          // 오늘 예약하면 보통 내일 픽업이 정상이며, 일요일은 픽업 안됨
          const isResDateValid = resDateYmd && (
            resDateYmd >= tomorrowYmd && // 내일 이후여야 함
            resDateDayOfWeek !== 0 // 일요일이 아니어야 함
          );
          
          console.log('🔍 개발 체크 - API 응답 검증:', {
            hasRegiNo: !!epostResponse.regiNo,
            hasResNo: !!epostResponse.resNo,
            hasResDate: !!epostResponse.resDate,
            regiNo: epostResponse.regiNo,
            resNo: epostResponse.resNo,
            resDate: epostResponse.resDate,
            resDateYmd: resDateYmd,
            resDateDayOfWeek: resDateDayOfWeek,
            resDateDayName: resDateDayName,
            todayYmd: todayYmd,
            tomorrowYmd: tomorrowYmd,
            isResDateValid: isResDateValid,
            regiPoNm: epostResponse.regiPoNm,
            testYn: epostParams.testYn,
          });
          
          // ⚠️ 예약일시가 이상한 경우 경고
          if (!isResDateValid && resDateYmd) {
            const issues: string[] = [];
            if (resDateYmd < tomorrowYmd) {
              issues.push(`예약일시(${resDateYmd})가 내일(${tomorrowYmd})보다 이전입니다.`);
            }
            if (resDateDayOfWeek === 0) {
              issues.push(`예약일시(${resDateYmd})가 일요일입니다. 일요일은 픽업이 불가능합니다.`);
            }
            
            console.warn('⚠️ 예약일시가 이상합니다:', {
              예약일시: resDateYmd,
              예약일시요일: resDateDayName,
              오늘날짜: todayYmd,
              내일날짜: tomorrowYmd,
              문제점: issues.join(' '),
              경고: '예약일시는 내일 이후여야 하며, 일요일은 제외되어야 합니다.',
            });
          } else if (isResDateValid) {
            console.log('✅ 예약일시가 정상입니다:', {
              예약일시: resDateYmd,
              예약일시요일: resDateDayName,
              내일날짜: tomorrowYmd,
            });
          }
          
          // 🔍 개발 체크: 수거예약 확인 API 호출
          // 실제 수거예약이 등록되었는지 확인하기 위해 getResInfo API 호출
          if (epostParams.testYn === 'N' && epostResponse.resNo && epostResponse.resDate) {
            try {
              const reqYmd = epostResponse.resDate.substring(0, 8); // YYYYMMDD
              console.log('🔍 수거예약 상태 확인 API 호출:', {
                custNo: epostParams.custNo,
                reqType: epostParams.reqType,
                orderNo: epostParams.orderNo,
                reqYmd,
                resNo: epostResponse.resNo,
                resDate: epostResponse.resDate,
              });
              
              console.log('⏳ getResInfo API 호출 시작...');
              console.log('⏳ getResInfo API 호출 파라미터:', JSON.stringify({
                custNo: epostParams.custNo,
                reqType: epostParams.reqType,
                orderNo: epostParams.orderNo,
                reqYmd,
              }, null, 2));

              console.log('🚀 getResInfo 함수 호출 직전...');
              const resInfo = await getResInfo({
                custNo: epostParams.custNo,
                reqType: epostParams.reqType, // pickup: '2'(반품소포), delivery: '1'(일반소포)
                orderNo: epostParams.orderNo,
                reqYmd,
              });
              console.log('✅ getResInfo 함수 호출 완료!');
              
              console.log('✅ getResInfo API 호출 성공!');
              console.log('✅ getResInfo API 응답 데이터:', JSON.stringify(resInfo, null, 2));
              console.log('✅ 수거예약 상태 확인 결과:', {
                reqNo: resInfo.reqNo,
                resNo: resInfo.resNo,
                regiNo: resInfo.regiNo,
                treatStusCd: resInfo.treatStusCd,
                treatStusMeaning: {
                  '00': '신청준비',
                  '01': '소포신청',
                  '02': '운송장출력',
                  '03': '집하완료',
                  '04': '배송중',
                  '05': '배송완료',
                }[resInfo.treatStusCd] || '알 수 없음',
                regiPoNm: resInfo.regiPoNm,
                resDate: resInfo.resDate,
              });
              
              // 수거예약 상태가 '00' (신청준비) 또는 '01' (소포신청)이면 실제 수거예약이 등록된 것
              if (resInfo.treatStusCd === '00' || resInfo.treatStusCd === '01') {
                console.log('✅ 수거예약이 정상적으로 등록되었습니다.');
              } else {
                console.warn('⚠️ 수거예약 상태가 예상과 다릅니다:', resInfo.treatStusCd);
              }
            } catch (resInfoError: any) {
              console.error('❌ 수거예약 상태 확인 API 호출 실패!');
              console.error('❌ 에러 상세 정보:', {
                error: resInfoError,
                message: resInfoError?.message || '알 수 없는 오류',
                stack: resInfoError?.stack,
                name: resInfoError?.name,
                cause: resInfoError?.cause,
                toString: resInfoError?.toString(),
              });
              console.error('❌ 호출 파라미터:', {
                custNo: epostParams.custNo,
                reqType: '1',
                orderNo: epostParams.orderNo,
                reqYmd: epostResponse.resDate.substring(0, 8),
              });
              // 수거예약 상태 확인 실패해도 계속 진행 (경고만 출력)
            }
          } else {
            console.log('⚠️ 수거예약 상태 확인 API 호출 건너뜀:', {
              reason: epostParams.testYn === 'Y' 
                ? 'testYn=Y이므로 테스트 모드입니다.'
                : !epostResponse.resNo || !epostResponse.resDate
                ? 'resNo 또는 resDate가 없습니다.'
                : '알 수 없는 이유',
            });
          }
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
    
    // 🗓️ 수거 예정일을 Date 형식으로 변환 (DB 저장용)
    const pickupScheduledDate = pickupDate 
      ? `${pickupDate.substring(0, 4)}-${pickupDate.substring(4, 6)}-${pickupDate.substring(6, 8)}`
      : null;
    
    console.log('📅 수거 예정일:', {
      pickupDate,           // YYYYMMDD
      pickupScheduledDate,  // YYYY-MM-DD
    });

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

    // delivery_info에 notifyMsg와 도서산간 정보 저장
    // 도서산간 판단 로직
    let isIsland = false;
    
    // 1. 우체국 API의 islandAddFee 확인 (가장 정확)
    const islandAddFeeValue = epostResponse.islandAddFee;
    if (islandAddFeeValue) {
      // 문자열이면 숫자로 변환, 숫자면 그대로 사용
      const fee = typeof islandAddFeeValue === 'string' 
        ? parseFloat(islandAddFeeValue.replace(/[^0-9.-]/g, '')) 
        : Number(islandAddFeeValue);
      isIsland = !isNaN(fee) && fee > 0;
    }
    
    // 2. 우편번호 기반 도서산간 지역 판단 (우체국 API 응답이 없을 때 대체 방법)
    if (!isIsland && deliveryInfo.zipcode) {
      const zipcode = deliveryInfo.zipcode.replace(/-/g, '').trim();
      if (zipcode.length >= 2) {
        const prefix = zipcode.substring(0, 2);
        // 제주도: 63xxx, 64xxx, 65xxx, 66xxx, 67xxx, 68xxx, 69xxx
        // 울릉도: 402xx
        const islandZipPrefixes = ['63', '64', '65', '66', '67', '68', '69']; // 제주도
        const islandZipPrefixes2 = ['402']; // 울릉도
        
        if (islandZipPrefixes.includes(prefix) || 
            islandZipPrefixes2.some(p => zipcode.startsWith(p))) {
          isIsland = true;
          console.log(`🏝️ 우편번호 기반 도서산간 판단: ${zipcode} (${deliveryInfo.address})`);
        }
      }
    }
    
    // 3. 주소 기반 판단 (최후의 수단)
    if (!isIsland && deliveryInfo.address) {
      const address = deliveryInfo.address.toLowerCase();
      const islandKeywords = ['제주', '울릉', '독도', '우도', '마라도', '비양도', '추자도', '가파도'];
      if (islandKeywords.some(keyword => address.includes(keyword))) {
        isIsland = true;
        console.log(`🏝️ 주소 기반 도서산간 판단: ${deliveryInfo.address}`);
      }
    }
    
    // 토요배송 휴무지역 알림 확인
    const isSaturdayClosed = epostResponse.notifyMsg?.includes('토요배달') || 
                             epostResponse.notifyMsg?.includes('토요배송') ||
                             epostResponse.notifyMsg?.includes('토요');
    
    // 🗓️ 토요휴무지역 요일별 안내 메시지 생성
    let saturdayClosedMessage = '';
    if (isSaturdayClosed) {
      const resDateStr = epostResponse.resDate; // YYYYMMDDHHMMSS 형식
      if (resDateStr && resDateStr.length >= 8) {
        const resYear = parseInt(resDateStr.substring(0, 4));
        const resMonth = parseInt(resDateStr.substring(4, 6)) - 1;
        const resDay = parseInt(resDateStr.substring(6, 8));
        const resDateObj = new Date(resYear, resMonth, resDay);
        const dayOfWeek = resDateObj.getDay(); // 0:일, 1:월, ... 5:금, 6:토
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        
        // 수거 예약일 기준 안내
        if (dayOfWeek === 5) { // 금요일 수거 예약
          saturdayClosedMessage = '토요배송 휴무지역입니다. 수거된 물품은 월요일에 센터로 배송됩니다.';
        } else if (dayOfWeek === 6) { // 토요일 수거 예약 (우체국이 토요일 수거 진행 시)
          saturdayClosedMessage = '토요배송 휴무지역입니다. 토요일에 수거 후 월요일에 센터로 배송됩니다.';
        } else {
          saturdayClosedMessage = `토요배송 휴무지역입니다. ${dayNames[dayOfWeek]}요일에 수거 예정입니다.`;
        }
        
        console.log('🗓️ 토요휴무지역 안내:', {
          resDate: resDateStr,
          dayOfWeek: dayNames[dayOfWeek],
          message: saturdayClosedMessage,
        });
      } else {
        saturdayClosedMessage = '토요배송 휴무지역입니다. 토요일에는 배송이 진행되지 않습니다.';
      }
    }
    
    // deliveryCodeInfo 초기화 (필요한 경우 우편번호 기반 조회로 대체 가능)
    const deliveryCodeInfo = {};
    
    const deliveryInfoData: any = {
      ...deliveryCodeInfo,
      notifyMsg: epostResponse.notifyMsg || undefined,
      islandAddFee: epostResponse.islandAddFee || undefined,
      isIsland: isIsland, // 도서산간 여부 (실제 부가이용료가 있을 때만 true)
      isSaturdayClosed: isSaturdayClosed, // 토요배송 휴무지역 여부
      saturdayClosedMessage: saturdayClosedMessage || undefined, // 토요휴무 안내 메시지
    };

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
          pickup_scheduled_date: pickupScheduledDate, // 🗓️ 수거 예정일 (D-1, 당일 알림용)
          delivery_info: deliveryInfoData, // notifyMsg와 도서산간 정보 포함
          tracking_events: [{
            timestamp: new Date().toISOString(),
            status: 'BOOKED',
            description: '수거예약 완료',
            location: epostResponse.regiPoNm,
            reqNo: epostResponse.reqNo,
            resNo: epostResponse.resNo,
            apprNo: epostParams.apprNo, // 취소 시 사용할 승인번호 저장
            reqType: epostParams.reqType, // 취소 시 사용할 소포신청 구분 (1:일반소포, 2:반품소포)
            payType: epostParams.payType, // 취소 시 사용할 요금 납부 구분 (1:일반, 2:착불)
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
          pickup_scheduled_date: pickupScheduledDate, // 🗓️ 수거 예정일 (D-1, 당일 알림용)
          delivery_info: deliveryInfoData, // notifyMsg와 도서산간 정보 포함
          tracking_events: [{
            timestamp: new Date().toISOString(),
            status: 'BOOKED',
            description: '수거예약 완료',
            location: epostResponse.regiPoNm,
            reqNo: epostResponse.reqNo,
            resNo: epostResponse.resNo,
            apprNo: epostParams.apprNo, // 취소 시 사용할 승인번호 저장
            reqType: epostParams.reqType, // 취소 시 사용할 소포신청 구분 (1:일반소포, 2:반품소포)
            payType: epostParams.payType, // 취소 시 사용할 요금 납부 구분 (1:일반, 2:착불)
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
      // 기본 수거예약 알림
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

      // 토요배송 휴무지역 알림 (별도 알림)
      if (isSaturdayClosed) {
        const notificationBody = saturdayClosedMessage || 
          `수거 예약이 완료되었습니다. 다만 배송지가 토요배송 휴무지역입니다. ${epostResponse.notifyMsg || '토요일에는 배송이 진행되지 않습니다.'}`;
        
        const { error: saturdayNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: existingOrder.user_id,
            type: 'SHIPMENT_BOOKED',
            title: '⚠️ 토요배송 휴무지역 안내',
            body: notificationBody,
            order_id: order_id,
            tracking_no: pickupTrackingNo,
          });

        if (saturdayNotificationError) {
          console.error('토요배송 알림 생성 실패:', saturdayNotificationError);
        } else {
          console.log('✅ 토요배송 휴무지역 알림 생성 완료:', notificationBody);
        }
      }

      // 도서산간 알림 (별도 알림) - 실제 부가이용료가 있을 때만
      if (isIsland && epostResponse.islandAddFee) {
        const { error: islandNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: existingOrder.user_id,
            type: 'SHIPMENT_BOOKED',
            title: '🏝️ 도서산간 배송 안내',
            body: `수거 예약이 완료되었습니다. 배송지가 도서산간 지역으로 배송 소요시간이 추가될 수 있습니다. (부가이용료: ₩${parseInt(epostResponse.islandAddFee || '0').toLocaleString()})`,
            order_id: order_id,
            tracking_no: pickupTrackingNo,
          });

        if (islandNotificationError) {
          console.error('도서산간 알림 생성 실패:', islandNotificationError);
        } else {
          console.log('✅ 도서산간 알림 생성 완료');
        }
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

