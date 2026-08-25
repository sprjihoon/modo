/**
 * 결제됐는데 수거송장이 없는 주문을 찾아 서버에서 다시 예약한다.
 * Supabase Cron 이 6시간마다 호출한다.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { bookPickupWithRetry, notifyStaffPickupBookFailed } from '../_shared/book-pickup.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_PER_RUN = 20;
const MIN_AGE_MS = 2 * 60 * 1000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!serviceKey || token !== serviceKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const now = Date.now();
    const minCreated = new Date(now - MAX_AGE_MS).toISOString();
    const maxCreated = new Date(now - MIN_AGE_MS).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, pickup_address, pickup_address_detail, pickup_zipcode, pickup_phone, delivery_address, delivery_address_detail, delivery_zipcode, delivery_phone, notes')
      .eq('status', 'PAID')
      .eq('payment_status', 'PAID')
      .is('tracking_no', null)
      .is('canceled_at', null)
      .gte('created_at', minCreated)
      .lte('created_at', maxCreated)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) {
      console.error('[reconcile-pickup] 조회 실패:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!orders?.length) {
      console.log('[reconcile-pickup] 대상 없음');
      return Response.json({ scanned: 0, booked: 0, failed: 0 });
    }

    console.log(`[reconcile-pickup] 대상 ${orders.length}건`);
    const results: Array<Record<string, unknown>> = [];
    let booked = 0;
    let failed = 0;

    for (const order of orders) {
      const bookResult = await bookPickupWithRetry({
        orderId: order.id,
        payload: {
          customer_name: order.customer_name || '',
          pickup_address: order.pickup_address || '',
          pickup_address_detail: order.pickup_address_detail || '',
          pickup_zipcode: order.pickup_zipcode || '',
          pickup_phone: order.pickup_phone || '',
          delivery_address: order.delivery_address || order.pickup_address || '',
          delivery_address_detail: order.delivery_address_detail || order.pickup_address_detail || '',
          delivery_zipcode: order.delivery_zipcode || order.pickup_zipcode || '',
          delivery_phone: order.delivery_phone || order.pickup_phone || '',
          delivery_message: order.notes || '',
        },
      });

      if (bookResult.ok) {
        booked += 1;
        results.push({ orderId: order.id, ok: true, trackingNo: bookResult.trackingNo });
      } else {
        failed += 1;
        results.push({ orderId: order.id, ok: false, error: bookResult.error, code: bookResult.code });
        await notifyStaffPickupBookFailed(supabase, {
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          error: bookResult.error,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return Response.json({ scanned: orders.length, booked, failed, results });
  } catch (e) {
    console.error('[reconcile-pickup] 오류:', e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
