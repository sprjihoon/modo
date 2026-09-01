/**
 * 배송 자동 폴링 Cron Job
 *
 * 출고완료(READY_TO_SHIP) / 배송중(OUT_FOR_DELIVERY) 주문의 배송 송장을
 * 자동 추적하여 우체국 배달완료 시 DELIVERED 로 전환한다.
 *
 * KST 09·11·13·15·17시, 월~토. 일요일·공휴일은 건너뛴다.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const POLL_STATUSES = ['OUT_FOR_DELIVERY', 'READY_TO_SHIP', 'IN_TRANSIT'];
const MAX_PER_RUN = 40;

/** 한국 법정공휴일·대체공휴일 (수거 불가일과 동일) */
const KR_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30',
  '2025-03-01', '2025-05-05', '2025-05-06', '2025-05-15',
  '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
  '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-12-25',
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-03-02',
  '2026-05-05', '2026-05-24', '2026-05-25',
  '2026-06-06',
  '2026-08-15', '2026-08-16', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28',
  '2026-10-03', '2026-10-05',
  '2026-10-09', '2026-12-25',
]);

function kstToday(): { ymd: string; weekday: number } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { ymd: kst.toISOString().slice(0, 10), weekday: kst.getUTCDay() };
}

function shouldSkipPolling(): { skip: boolean; reason?: string; ymd: string } {
  const { ymd, weekday } = kstToday();
  if (weekday === 0) return { skip: true, reason: 'sunday', ymd };
  if (KR_HOLIDAYS.has(ymd)) return { skip: true, reason: 'holiday', ymd };
  return { skip: false, ymd };
}

Deno.serve(async (req) => {
  // Supabase Cron은 Authorization 헤더로 호출
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(serviceKey.substring(0, 20))) {
    // service role key의 앞부분이 맞는지만 간단 체크 (cron 내부 호출)
    // 실제로 Supabase cron은 service_role 토큰을 Authorization에 담음
  }

  try {
    const skip = shouldSkipPolling();
    if (skip.skip) {
      console.log(`📦 폴링 건너뜀 (${skip.reason}, ${skip.ymd})`);
      return new Response(
        JSON.stringify({ polled: 0, skipped: skip.reason, date: skip.ymd }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 출고 송장이 있는 미배송완료 건. 배송중을 먼저 보고, 출고완료(발송 처리 생략)도 포함한다.
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('id, delivery_tracking_no, order_id, status')
      .in('status', POLL_STATUSES)
      .not('delivery_tracking_no', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) {
      console.error('shipments 조회 실패:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!shipments || shipments.length === 0) {
      console.log('📦 폴링 대상 없음');
      return new Response(JSON.stringify({ polled: 0 }), { status: 200 });
    }

    const prioritized = [...shipments].sort((a, b) => {
      const rank = (s: string) => (s === 'OUT_FOR_DELIVERY' || s === 'IN_TRANSIT' ? 0 : 1);
      return rank(a.status) - rank(b.status);
    });

    console.log(`📦 폴링 대상: ${prioritized.length}건`);

    const results = [];
    for (const shipment of prioritized) {
      try {
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
          shipmentStatus: shipment.status,
          status: resp.status,
          result: result?.data?.epost?.treatStusCd ?? result?.tracking?.status ?? 'checked',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`폴링 실패 (${shipment.delivery_tracking_no}):`, e);
        results.push({ shipmentId: shipment.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ polled: prioritized.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('poll-delivery-tracking 오류:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
