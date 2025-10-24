/**
 * 결제 검증 API
 * POST /payments-verify
 * 
 * PortOne(아임포트) 결제 검증
 */

import { corsHeaders, handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface PaymentVerifyRequest {
  imp_uid: string;
  merchant_uid: string;
  order_id: string;
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
    const body: PaymentVerifyRequest = await req.json();
    const { imp_uid, merchant_uid, order_id } = body;

    // 필수 필드 검증
    if (!imp_uid || !merchant_uid || !order_id) {
      return errorResponse('Missing required fields', 400);
    }

    // TODO: PortOne API로 결제 검증
    // 현재는 Mock 검증
    const mockVerified = true;
    const mockAmount = 15000;

    if (!mockVerified) {
      return errorResponse('Payment verification failed', 400);
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 결제 정보 저장
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id,
        imp_uid,
        merchant_uid,
        amount: mockAmount,
        status: 'PAID',
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return errorResponse('Failed to save payment', 500);
    }

    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: 'PAID',
        status: 'PAID',
      })
      .eq('id', order_id);

    if (orderError) {
      console.error('Order update error:', orderError);
      return errorResponse('Failed to update order', 500);
    }

    // 성공 응답
    return successResponse({
      verified: true,
      payment,
      message: '결제가 완료되었습니다',
    });

  } catch (error) {
    console.error('Payment verify error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

