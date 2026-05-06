/**
 * 우체국 자유 수거/발송 테스트 취소 API (관리자 전용)
 * POST /epost-test-cancel
 *
 * epost_test_logs 의 송장을 취소한다.
 * 기존 shipments-cancel 과 분리되어 운영됨.
 */

import { handleCorsOptions } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { cancelOrder } from '../_shared/epost/index.ts';

interface EpostTestCancelRequest {
  log_id: string;
  delete_after_cancel?: boolean; // 기본 true (완전 삭제)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body: EpostTestCancelRequest = await req.json();
    const { log_id, delete_after_cancel = true } = body;

    if (!log_id) {
      return errorResponse('Missing log_id', 400, 'MISSING_FIELDS');
    }

    const supabase = createSupabaseClient(req);

    const { data: log, error: logError } = await supabase
      .from('epost_test_logs')
      .select('*')
      .eq('id', log_id)
      .single();

    if (logError || !log) {
      return errorResponse('테스트 로그를 찾을 수 없습니다.', 404, 'LOG_NOT_FOUND');
    }

    if (!log.tracking_no) {
      return errorResponse('송장번호가 없는 로그는 취소할 수 없습니다.', 400, 'NO_TRACKING_NO');
    }

    if (log.status === 'CANCELLED') {
      return errorResponse('이미 취소된 로그입니다.', 400, 'ALREADY_CANCELLED');
    }

    const custNo = Deno.env.get('EPOST_CUSTOMER_ID') || '';
    if (!custNo) {
      return errorResponse('EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.', 500, 'MISSING_ENV');
    }

    // reqYmd: 신청 등록일자 (YYYYMMDD)
    let reqYmd = '';
    if (log.res_date && log.res_date.length >= 8) {
      reqYmd = log.res_date.substring(0, 8);
    } else if (log.created_at) {
      const d = new Date(log.created_at);
      reqYmd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    } else {
      const today = new Date();
      reqYmd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    }

    const reqType = (log.req_type || (log.shipment_type === 'pickup' ? '2' : '1')) as '1' | '2';
    const payType = (log.pay_type || (log.shipment_type === 'pickup' ? '2' : '1')) as '1' | '2';

    console.log('🔄 [epost-test-cancel] 취소 요청:', {
      log_id,
      tracking_no: log.tracking_no,
      reqNo: log.req_no,
      resNo: log.res_no,
      apprNo: log.appr_no,
      reqType,
      payType,
      reqYmd,
    });

    let cancelResult: any = null;
    let cancelError: string | null = null;
    try {
      cancelResult = await cancelOrder({
        custNo,
        apprNo: log.appr_no || Deno.env.get('EPOST_APPROVAL_NO') || '0000000000',
        reqType,
        payType,
        reqNo: log.req_no || '',
        resNo: log.res_no || '',
        regiNo: log.tracking_no,
        reqYmd,
        delYn: delete_after_cancel ? 'Y' : 'N',
      });
      console.log('✅ [epost-test-cancel] 응답:', cancelResult);
    } catch (e: any) {
      console.error('❌ [epost-test-cancel] 우체국 취소 실패:', e);
      cancelError = e?.message || String(e);

      // ERR-123: 예약 정보 없음 → DB만 정리
      const isNoReservation =
        cancelError?.includes('ERR-123') ||
        cancelError?.includes('예약된 정보가 없습니다') ||
        cancelError?.includes('접수정보로 예약된 정보가 없');

      if (!isNoReservation) {
        await supabase
          .from('epost_test_logs')
          .update({
            status: 'CANCEL_FAILED',
            cancel_response: { error: cancelError } as any,
          })
          .eq('id', log_id);

        return errorResponse(
          `우체국 취소 실패: ${cancelError}`,
          500,
          'EPOST_CANCEL_FAILED'
        );
      }

      cancelResult = {
        canceledYn: 'Y',
        note: '우체국 예약 정보 없음 (DB만 업데이트)',
      };
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('epost_test_logs')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancel_response: cancelResult as any,
      })
      .eq('id', log_id);

    if (updateError) {
      console.error('❌ epost_test_logs 취소 업데이트 실패:', updateError);
    }

    return successResponse({
      message: '테스트 송장이 취소되었습니다.',
      log_id,
      cancelled: true,
      epost_result: cancelResult,
    });
  } catch (error: any) {
    console.error('[epost-test-cancel] error:', error);
    return errorResponse(error?.message || 'Internal server error', 500);
  }
});
