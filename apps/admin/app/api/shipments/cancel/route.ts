import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const PAID_STATUSES = new Set(['PAID', 'COMPLETED', 'DONE']);

function getPortoneApiSecret(): string {
  const key = process.env.PORTONE_API_SECRET;
  if (!key) throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.');
  return key;
}

/**
 * 수거 취소 + 카드 결제 자동 취소 API
 *
 * 1. 우체국 수거 예약 취소 (Edge Function)
 * 2. 결제가 완료된 주문이면 Toss 카드 자동 취소
 * 3. orders 상태 → CANCELLED, payment_status → CANCELED
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, skip_payment_cancel } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: 'order_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
    }

    // ── 1. 주문 정보 조회 ──────────────────────────────────────────
    const supabaseAdmin = getSupabaseAdmin();
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, status, payment_status, payment_id, total_price')
      .eq('id', order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const paymentKey = (order as any).payment_id as string | null;
    const paymentStatus = (order as any).payment_status as string | null;
    const totalPrice = (order as any).total_price as number | null;
    const hasValidPayment = !!paymentKey && PAID_STATUSES.has(paymentStatus ?? '');

    // ── 2. 수거 취소 (우체국 전산) ─────────────────────────────────
    console.log('🔄 수거 취소 요청:', { order_id });

    const shipmentCancelRes = await fetch(
      `${supabaseUrl}/functions/v1/shipments-cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ order_id, delete_after_cancel: false }),
      }
    );

    const shipmentResult = await shipmentCancelRes.json();

    if (!shipmentCancelRes.ok) {
      console.error('❌ 수거 취소 실패:', shipmentResult);
      return NextResponse.json(
        {
          success: false,
          error: shipmentResult.error || '수거 취소에 실패했습니다.',
          step: 'shipment',
        },
        { status: 500 }
      );
    }

    console.log('✅ 수거 취소 완료');

    // ── 3. 카드 결제 취소 (Toss) ───────────────────────────────────
    let paymentCancelResult: Record<string, unknown> | null = null;
    let paymentCancelError: string | null = null;

    if (hasValidPayment && !skip_payment_cancel) {
      try {
        console.log('💳 카드 결제 취소 시작:', paymentKey);

        const portoneRes = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentKey)}/cancel`,
          {
            method: 'POST',
            headers: {
              Authorization: `PortOne ${getPortoneApiSecret()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: '수거 취소로 인한 자동 결제 취소' }),
          }
        );

        const tossData = await portoneRes.json();

        if (!portoneRes.ok) {
          console.error('❌ 포트원 결제 취소 실패:', tossData);
          paymentCancelError = tossData.message || '카드 취소 실패';
        } else {
          console.log('✅ 카드 결제 취소 완료');
          paymentCancelResult = tossData;

          // DB 업데이트
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'CANCELLED',
              payment_status: 'CANCELED',
              canceled_at: new Date().toISOString(),
            })
            .eq('id', order_id);

          // 취소 로그
          try {
            await supabaseAdmin.from('payment_logs').insert({
              order_id,
              payment_id: paymentKey,
              amount: totalPrice ?? tossData.totalAmount,
              status: 'CANCELED',
              provider: 'PORTONE',
              response_data: tossData,
              created_at: new Date().toISOString(),
            });
          } catch { /* 로그 실패는 무시 */ }
        }
      } catch (e: any) {
        console.error('❌ 결제 취소 예외:', e);
        paymentCancelError = e.message || '카드 취소 중 오류';
      }
    } else {
      // 결제 없거나 skip 시 주문 상태만 CANCELLED로
      await supabaseAdmin
        .from('orders')
        .update({ status: 'CANCELLED', canceled_at: new Date().toISOString() })
        .eq('id', order_id);
    }

    return NextResponse.json({
      success: true,
      message: shipmentResult.message || '수거 예약이 취소되었습니다.',
      shipmentCanceled: true,
      paymentCanceled: !!paymentCancelResult,
      paymentCancelError,
      hasValidPayment,
    });
  } catch (error: any) {
    console.error('❌ 수거 취소 처리 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '수거 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

