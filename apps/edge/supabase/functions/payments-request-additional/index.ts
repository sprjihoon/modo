/**
 * 추가 결제 요청 API
 * POST /payments-request-additional
 * 
 * 검수 후 추가 비용 발생 시 고객에게 추가 결제 요청
 */

import { handleCorsOptions, getCorsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdminClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface AdditionalPaymentRequest {
  order_id: string;
  amount: number;
  reason: string;
  description?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // 요청 본문 파싱
    const body: AdditionalPaymentRequest = await req.json();
    const { order_id, amount, reason, description } = body;

    // 필수 필드 검증
    if (!order_id || !amount || !reason) {
      return errorResponse('Missing required fields: order_id, amount, reason', 400, 'MISSING_FIELDS');
    }

    // 금액 검증
    if (amount <= 0) {
      return errorResponse('Amount must be greater than 0', 400, 'INVALID_AMOUNT');
    }

    // Authorization 헤더에서 JWT를 추출하여 실제 호출자 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const callerJwt = authHeader.replace('Bearer ', '');

    // service_role 클라이언트로 JWT를 명시적으로 전달하여 사용자 확인
    const adminClient = createSupabaseAdminClient();
    const { data: { user }, error: userError } = await adminClient.auth.getUser(callerJwt);
    if (userError || !user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const callerRole = user.user_metadata?.role || user.app_metadata?.role;
    if (callerRole !== 'admin') {
      return errorResponse('Admin role required', 403, 'FORBIDDEN');
    }

    // DB 작업용 service_role 클라이언트
    const supabase = createSupabaseClient(req);

    // 주문 존재 여부 확인
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, total_price, status, payment_status')
      .eq('id', order_id)
      .single();

    if (orderCheckError || !existingOrder) {
      return errorResponse('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // 토스페이먼츠용 고유 주문번호 생성
    const timestamp = Date.now();
    const orderIdToss = `${existingOrder.order_number}-EXTRA-${timestamp}`;

    console.log('📝 추가 결제 요청 생성:', {
      order_id,
      amount,
      reason,
      orderIdToss,
      requestedBy: user.id,
    });

    // 추가 결제 레코드 생성
    const { data: additionalPayment, error: insertError } = await supabase
      .from('additional_payments')
      .insert({
        order_id,
        amount,
        reason,
        description,
        order_id_toss: orderIdToss,
        status: 'PENDING',
        requested_by: user.id,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ 추가 결제 생성 실패:', insertError);
      return errorResponse(`Failed to create additional payment: ${insertError.message}`, 500, 'DB_ERROR');
    }

    console.log('✅ 추가 결제 레코드 생성:', additionalPayment.id);

    // 주문 상태 업데이트
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'WAITING_ADDITIONAL_PAYMENT',
        payment_status: 'WAITING_ADDITIONAL',
      })
      .eq('id', order_id);

    if (orderUpdateError) {
      console.error('⚠️ 주문 상태 업데이트 실패:', orderUpdateError);
      // 주문 상태 업데이트 실패해도 추가 결제 요청은 생성됨
    }

    // 알림 생성 (고객에게)
    if (existingOrder.user_id) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingOrder.user_id,
          type: 'ADDITIONAL_PAYMENT_REQUESTED',
          title: '추가 비용 안내',
          body: `${reason}으로 인해 ${amount.toLocaleString()}원의 추가 비용이 발생했습니다.`,
          order_id,
        });

      if (notificationError) {
        console.error('⚠️ 알림 생성 실패:', notificationError);
      } else {
        console.log('✅ 고객 알림 생성 성공');
      }
    }

    // 성공 응답
    return successResponse(
      {
        additional_payment: additionalPayment,
        message: '추가 결제 요청이 생성되었습니다',
        payment_url: `/orders/${order_id}/additional-payment/${additionalPayment.id}`,
      },
      201
    );

  } catch (error) {
    console.error('Additional payment request error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});

