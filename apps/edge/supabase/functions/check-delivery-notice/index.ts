/**
 * 배송지 우편번호 확인 및 알림 정보 조회
 * 
 * POST /check-delivery-notice
 * Body: { zipcode: string, address?: string }
 * Response: { 
 *   notifyMsg?: string, 
 *   islandAddFee?: string,
 *   shouldShowAlert: boolean,
 *   alertMessage?: string
 * }
 */

import { corsHeaders } from '../_shared/cors.ts';
import { getDeliveryCode } from '../_shared/epost/index.ts';

interface CheckDeliveryNoticeRequest {
  zipcode: string;
  address?: string;
}

Deno.serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const body: CheckDeliveryNoticeRequest = await req.json();
    const { zipcode, address } = body;

    if (!zipcode) {
      return new Response(
        JSON.stringify({ error: 'zipcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 집배코드 조회
    const deliveryCode = await getDeliveryCode({ zipcode, address });
    
    // 금요일 확인
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0: 일요일, 5: 금요일
    const isFriday = dayOfWeek === 5;
    
    // 알림 메시지 구성
    let shouldShowAlert = false;
    let alertMessage = '';
    
    // 토요배송 휴무 알림 (금요일에만)
    if (isFriday && deliveryCode.notifyMsg?.includes('토요배달')) {
      shouldShowAlert = true;
      alertMessage = `⚠️ ${deliveryCode.notifyMsg}\n\n금요일에 수거 신청하시면 토요일 배송이 불가능한 지역입니다. 월요일에 배송됩니다.`;
    }
    
    // 도서산간 알림 (항상 표시)
    if (deliveryCode.islandAddFee) {
      shouldShowAlert = true;
      const islandMsg = `🏝️ 도서산간 지역입니다.\n배송이 평소보다 1-2일 더 소요될 수 있습니다.\n(부가요금: ${deliveryCode.islandAddFee}원)`;
      alertMessage = alertMessage ? `${alertMessage}\n\n${islandMsg}` : islandMsg;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        notifyMsg: deliveryCode.notifyMsg,
        islandAddFee: deliveryCode.islandAddFee,
        noticeCont: deliveryCode.noticeCont,
        shouldShowAlert,
        alertMessage,
        isFriday,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('❌ 배송지 확인 실패:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || '배송지 확인 실패',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
