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
      return errorResponse('Missing required fields', 400, 'MISSING_FIELDS');
    }

    // Supabase 클라이언트 생성
    const supabase = createSupabaseClient(req);

    // 주문 존재 및 금액 확인
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('id, total_price, payment_status')
      .eq('id', order_id)
      .single();

    if (orderCheckError || !existingOrder) {
      return errorResponse('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // 이미 결제 완료된 주문
    if (existingOrder.payment_status === 'PAID') {
      return errorResponse('Payment already completed', 400, 'ALREADY_PAID');
    }

    // TODO: PortOne API로 실제 결제 검증
    // const portoneResponse = await fetch('https://api.iamport.kr/payments/verify', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${await getPortOneAccessToken()}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ imp_uid, merchant_uid, amount: existingOrder.total_price })
    // });
    // const { data: verification } = await portoneResponse.json();
    
    // 현재는 Mock 검증
    const mockVerified = true;
    const verifiedAmount = existingOrder.total_price;

    if (!mockVerified) {
      return errorResponse('Payment verification failed', 400, 'VERIFICATION_FAILED');
    }

    // 금액 불일치 확인
    if (verifiedAmount !== existingOrder.total_price) {
      return errorResponse('Amount mismatch', 400, 'AMOUNT_MISMATCH');
    }

    // 결제 정보 저장 (upsert)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .upsert({
        order_id,
        imp_uid,
        merchant_uid,
        amount: verifiedAmount,
        payment_method: 'CARD',
        status: 'PAID',
        buyer_name: existingOrder.customer_name || 'Unknown',
        buyer_email: existingOrder.customer_email || 'unknown@example.com',
        buyer_phone: existingOrder.customer_phone || '000-0000-0000',
        paid_at: new Date().toISOString(),
      }, {
        onConflict: 'imp_uid',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment upsert error:', paymentError);
      return errorResponse('Failed to save payment', 500, 'DB_ERROR');
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
      return errorResponse('Failed to update order', 500, 'DB_ERROR');
    }

    // 알림 생성
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: existingOrder.user_id,
        type: 'PAYMENT_COMPLETED',
        title: '결제 완료',
        body: `${verifiedAmount.toLocaleString()}원 결제가 완료되었습니다.`,
        order_id,
      });

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
    }

    // 성공 응답
    return successResponse(
      {
        verified: true,
        payment,
        message: '결제가 완료되었습니다',
      }
    );

  } catch (error) {
    console.error('Payment verify error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

