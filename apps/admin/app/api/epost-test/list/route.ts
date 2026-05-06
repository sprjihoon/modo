import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * 우체국 자유 수거/발송 테스트 - 로그 목록 조회 (관리자 전용)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('epost_test_logs' as any)
      .select(`
        id,
        created_at,
        cancelled_at,
        sender_name,
        sender_zipcode,
        sender_address,
        sender_address_detail,
        sender_phone,
        receiver_name,
        receiver_zipcode,
        receiver_address,
        receiver_address_detail,
        receiver_phone,
        shipment_type,
        pay_type,
        goods_name,
        weight_kg,
        volume_cm,
        micro_yn,
        size_preset,
        delivery_message,
        status,
        tracking_no,
        req_no,
        res_no,
        regi_po_nm,
        res_date,
        price,
        note
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[epost-test/list] error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[epost-test/list] error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
