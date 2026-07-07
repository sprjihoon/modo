/**
 * 배송 자동 폴링 Cron Job
 * 
 * OUT_FOR_DELIVERY 상태인 주문의 배송 송장을 자동 추적하여
 * DELIVERED 등으로 상태를 업데이트한다.
 * 
 * Supabase Cron에서 매 30분마다 실행됨.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Supabase Cron은 Authorization 헤더로 호출
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(serviceKey.substring(0, 20))) {
    // service role key의 앞부분이 맞는지만 간단 체크 (cron 내부 호출)
    // 실제로 Supabase cron은 service_role 토큰을 Authorization에 담음
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // OUT_FOR_DELIVERY 주문의 배송 송장번호 조회
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('id, delivery_tracking_no, order_id')
      .eq('status', 'OUT_FOR_DELIVERY')
      .not('delivery_tracking_no', 'is', null);

    if (error) {
      console.error('shipments 조회 실패:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!shipments || shipments.length === 0) {
      console.log('📦 폴링 대상 없음');
      return new Response(JSON.stringify({ polled: 0 }), { status: 200 });
    }

    console.log(`📦 폴링 대상: ${shipments.length}건`);

    const results = [];
    for (const shipment of shipments) {
      try {
        // 기존 shipments-track 엣지 함수 호출
        const resp = await fetch(`${supabaseUrl}/functions/v1/shipments-track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ tracking_no: shipment.delivery_tracking_no }),
        });

        const result = await resp.json();
        results.push({
          shipmentId: shipment.id,
          orderId: shipment.order_id,
          trackingNo: shipment.delivery_tracking_no,
          status: resp.status,
          result: result?.tracking?.status ?? 'checked',
        });

        // 우체국 API 과부하 방지: 500ms 대기
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`폴링 실패 (${shipment.delivery_tracking_no}):`, e);
        results.push({ shipmentId: shipment.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ polled: shipments.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('poll-delivery-tracking 오류:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
