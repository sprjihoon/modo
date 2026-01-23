/**
 * 카카오 알림톡 발송 모듈
 * 
 * 카카오 비즈메시지 API를 통해 알림톡 발송
 * 필요한 환경변수:
 * - KAKAO_BIZM_ACCOUNT: 비즈메시지 계정 (발신 프로필 ID)
 * - KAKAO_BIZM_API_KEY: API 키
 * - KAKAO_BIZM_SENDER_KEY: 발신 프로필 키 (카카오 채널 키)
 */

// 카카오 비즈메시지 API 엔드포인트
const KAKAO_BIZM_URL = 'https://alimtalk-api.kakao.com/v2/sender/send';

export interface AlimtalkButton {
  name: string;
  type: 'WL' | 'AL' | 'BK' | 'MD' | 'DS'; // WL: 웹링크, AL: 앱링크, BK: 봇키워드, MD: 메시지전달, DS: 배송조회
  url_mobile?: string;
  url_pc?: string;
  scheme_ios?: string;
  scheme_android?: string;
}

export interface AlimtalkRequest {
  phoneNumber: string;          // 수신자 전화번호 (01012345678 형식)
  templateCode: string;         // 알림톡 템플릿 코드
  templateVariables: Record<string, string>;  // 템플릿 변수
  buttons?: AlimtalkButton[];   // 버튼 (선택)
}

export interface AlimtalkResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * 전화번호 정규화 (하이픈 제거, 국가번호 제거)
 */
function normalizePhoneNumber(phone: string): string {
  // 하이픈, 공백 제거
  let normalized = phone.replace(/[-\s]/g, '');
  
  // +82 또는 82로 시작하면 010으로 변환
  if (normalized.startsWith('+82')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('82')) {
    normalized = '0' + normalized.slice(2);
  }
  
  return normalized;
}

/**
 * 템플릿 변수 치환
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // #{변수명} 형식 치환 (카카오 알림톡 기본 형식)
    result = result.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
    // {{변수명}} 형식도 지원
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

/**
 * 카카오 알림톡 발송
 */
export async function sendKakaoAlimtalk(
  request: AlimtalkRequest
): Promise<AlimtalkResponse> {
  const senderKey = Deno.env.get('KAKAO_BIZM_SENDER_KEY');
  const apiKey = Deno.env.get('KAKAO_BIZM_API_KEY');
  
  // 환경변수 체크
  if (!senderKey || !apiKey) {
    console.warn('⚠️ 카카오 알림톡 환경변수 미설정, 발송 스킵');
    return {
      success: false,
      error: 'Kakao Alimtalk not configured',
      errorCode: 'NOT_CONFIGURED',
    };
  }

  const phoneNumber = normalizePhoneNumber(request.phoneNumber);
  
  // 전화번호 유효성 검사
  if (!phoneNumber.match(/^01[0-9]{8,9}$/)) {
    console.warn('⚠️ 유효하지 않은 전화번호:', phoneNumber);
    return {
      success: false,
      error: 'Invalid phone number',
      errorCode: 'INVALID_PHONE',
    };
  }

  try {
    const payload = {
      senderKey,
      templateCode: request.templateCode,
      recipientList: [
        {
          recipientNo: phoneNumber,
          templateParameter: request.templateVariables,
          buttons: request.buttons || [],
        },
      ],
    };

    console.log('📱 알림톡 발송 요청:', {
      templateCode: request.templateCode,
      phone: phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-4),
    });

    const response = await fetch(KAKAO_BIZM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ 알림톡 발송 실패:', data);
      return {
        success: false,
        error: data.message || 'Alimtalk send failed',
        errorCode: data.code || 'API_ERROR',
      };
    }

    // 발송 결과 확인
    const sendResult = data.sendResults?.[0];
    if (sendResult?.resultCode === '0') {
      console.log('✅ 알림톡 발송 성공:', sendResult.requestId);
      return {
        success: true,
        messageId: sendResult.requestId,
      };
    } else {
      console.error('❌ 알림톡 발송 실패:', sendResult);
      return {
        success: false,
        error: sendResult?.resultMessage || 'Unknown error',
        errorCode: sendResult?.resultCode || 'UNKNOWN',
      };
    }

  } catch (error) {
    console.error('❌ 알림톡 API 호출 오류:', error);
    return {
      success: false,
      error: error.message || 'API call failed',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * NHN Cloud 알림톡 발송 (대안)
 * NHN Cloud 비즈메시지를 사용하는 경우
 */
const NHN_ALIMTALK_URL = 'https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys';

export async function sendNHNAlimtalk(
  request: AlimtalkRequest
): Promise<AlimtalkResponse> {
  const appKey = Deno.env.get('NHN_ALIMTALK_APP_KEY');
  const secretKey = Deno.env.get('NHN_ALIMTALK_SECRET_KEY');
  const senderKey = Deno.env.get('NHN_ALIMTALK_SENDER_KEY');
  
  if (!appKey || !secretKey || !senderKey) {
    console.warn('⚠️ NHN 알림톡 환경변수 미설정, 발송 스킵');
    return {
      success: false,
      error: 'NHN Alimtalk not configured',
      errorCode: 'NOT_CONFIGURED',
    };
  }

  const phoneNumber = normalizePhoneNumber(request.phoneNumber);

  try {
    const payload = {
      senderKey,
      templateCode: request.templateCode,
      recipientList: [
        {
          recipientNo: phoneNumber,
          templateParameter: request.templateVariables,
          buttons: request.buttons?.map(btn => ({
            ordering: 1,
            type: btn.type,
            name: btn.name,
            linkMo: btn.url_mobile,
            linkPc: btn.url_pc,
            schemeIos: btn.scheme_ios,
            schemeAndroid: btn.scheme_android,
          })),
        },
      ],
    };

    const response = await fetch(`${NHN_ALIMTALK_URL}/${appKey}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': secretKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.header?.isSuccessful) {
      return {
        success: true,
        messageId: data.message?.requestId,
      };
    } else {
      return {
        success: false,
        error: data.header?.resultMessage || 'Send failed',
        errorCode: data.header?.resultCode?.toString() || 'UNKNOWN',
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * 통합 알림톡 발송 함수
 * 환경변수에 따라 카카오 또는 NHN 사용
 */
export async function sendAlimtalk(
  request: AlimtalkRequest
): Promise<AlimtalkResponse> {
  // 우선 카카오 비즈메시지 시도
  if (Deno.env.get('KAKAO_BIZM_SENDER_KEY')) {
    return sendKakaoAlimtalk(request);
  }
  
  // NHN Cloud 대안
  if (Deno.env.get('NHN_ALIMTALK_APP_KEY')) {
    return sendNHNAlimtalk(request);
  }

  console.warn('⚠️ 알림톡 서비스 미설정');
  return {
    success: false,
    error: 'No alimtalk service configured',
    errorCode: 'NOT_CONFIGURED',
  };
}

/**
 * 알림톡 템플릿 코드 상수
 */
export const ALIMTALK_TEMPLATES = {
  // 주문 상태 알림
  ORDER_PAID: 'MODO_ORDER_PAID',                    // 결제 완료
  ORDER_BOOKED: 'MODO_ORDER_BOOKED',                // 수거 예약 완료
  ORDER_INBOUND: 'MODO_ORDER_INBOUND',              // 입고 완료
  ORDER_PROCESSING: 'MODO_ORDER_PROCESSING',        // 수선 시작
  ORDER_READY_TO_SHIP: 'MODO_ORDER_READY',          // 출고 완료
  ORDER_DELIVERED: 'MODO_ORDER_DELIVERED',          // 배송 완료
  ORDER_CANCELLED: 'MODO_ORDER_CANCELLED',          // 주문 취소
  
  // 추가 결제 알림
  EXTRA_CHARGE_REQUEST: 'MODO_EXTRA_CHARGE',        // 추가 결제 요청
  EXTRA_CHARGE_COMPLETED: 'MODO_EXTRA_COMPLETED',   // 추가 결제 완료
  
  // 수거일 알림
  PICKUP_REMINDER_D1: 'MODO_PICKUP_D1',             // 수거 D-1 알림
  PICKUP_REMINDER_TODAY: 'MODO_PICKUP_TODAY',       // 수거 당일 알림
} as const;

