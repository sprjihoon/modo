/**
 * 결제 게이트웨이 우회 → 주문 생성 → 우체국 수거예약 일괄 처리
 * POST /payments-test-skip
 *
 * 웹의 /api/admin/test/skip-payment 와 동일한 동작을 수행한다.
 * 모바일/웹 모두에서 호출 가능하며, ops_center_settings.show_test_buttons
 * 가 true 인 경우에만 작동한다.
 *
 * Body:
 *   {
 *     intent_id: string,        // payment_intents.id
 *     test_mode: boolean,       // true: shipments-book(test_mode=true) (Mock), false: 실제 호출
 *   }
 *
 * Auth: Authorization: Bearer <user_access_token>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

interface RequestBody {
  intent_id?: string;
  test_mode?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('서버 설정 오류 (SUPABASE_URL/SERVICE_ROLE_KEY 누락)', 500, 'MISSING_ENV');
    }

    // 1) 본문 검증
    const body: RequestBody = await req.json().catch(() => ({}));
    const intentId = (body.intent_id ?? '').toString().trim();
    const testMode = !!body.test_mode;
    if (!intentId) {
      return errorResponse('intent_id 가 필요합니다.', 400, 'MISSING_INTENT_ID');
    }

    // 2) 사용자 인증 확인 (Bearer token 으로 auth.getUser)
    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length).trim()
      : '';
    if (!accessToken) {
      return errorResponse('Authorization 헤더가 필요합니다.', 401, 'UNAUTHORIZED');
    }

    const userClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return errorResponse('인증 실패. 다시 로그인해주세요.', 401, 'UNAUTHORIZED');
    }
    const authUid = userData.user.id;

    // 3) Service-role admin 클라이언트
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4) 운영 안전 가드: show_test_buttons
    const { data: settings } = await admin
      .from('ops_center_settings')
      .select('show_test_buttons')
      .limit(1)
      .maybeSingle();
    if (!settings?.show_test_buttons) {
      return errorResponse(
        '테스트 버튼이 비활성화되어 있습니다. (관리자 설정에서 ON으로 변경하세요)',
        403,
        'TEST_BUTTONS_DISABLED'
      );
    }

    // 5) auth.uid → public.users.id 매핑
    const { data: userRow, error: userRowErr } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUid)
      .maybeSingle();
    if (userRowErr || !userRow?.id) {
      return errorResponse('사용자 프로필을 찾을 수 없습니다.', 404, 'USER_NOT_FOUND');
    }
    const internalUserId = userRow.id as string;

    // 6) intent 조회 + 권한/멱등성 검사
    const { data: intent, error: intentErr } = await admin
      .from('payment_intents')
      .select('id, total_price, payload, consumed_at, consumed_order_id, user_id')
      .eq('id', intentId)
      .maybeSingle();

    if (intentErr || !intent) {
      return errorResponse('결제 정보를 찾을 수 없습니다.', 404, 'INTENT_NOT_FOUND');
    }

    if (intent.consumed_at && intent.consumed_order_id) {
      // 이미 처리됨 → 멱등 응답
      return successResponse({
        orderId: intent.consumed_order_id,
        trackingNo: null,
        testMode,
        alreadyConsumed: true,
      });
    }

    if (intent.user_id && intent.user_id !== internalUserId) {
      return errorResponse(
        '다른 사용자의 결제는 테스트할 수 없습니다.',
        403,
        'CROSS_USER_FORBIDDEN'
      );
    }

    // 7) orders insert 데이터 구성 (web /api/admin/test/skip-payment 와 동일 매핑)
    const p = ((intent.payload as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const orderNumber = `ORD${Date.now()}`;

    const insertData: Record<string, unknown> = {
      user_id: internalUserId,
      status: 'PAID',
      payment_status: 'PAID',
      paid_at: new Date().toISOString(),
      order_number: orderNumber,
      item_name: p.itemName,
      clothing_type: p.clothingType,
      repair_type: p.repairType,
      pickup_address: p.pickupAddress,
      pickup_address_detail: p.pickupAddressDetail,
      pickup_zipcode: p.pickupZipcode,
      pickup_phone: p.pickupPhone,
      pickup_date: p.pickupDate,
      delivery_address: p.deliveryAddress,
      delivery_address_detail: p.deliveryAddressDetail,
      delivery_zipcode: p.deliveryZipcode,
      delivery_phone: p.deliveryPhone,
      customer_name: p.customerName,
      customer_email: p.customerEmail,
      customer_phone: p.customerPhone,
      notes: p.notes,
      base_price: p.basePrice,
      total_price: intent.total_price,
      shipping_fee: p.shippingFee,
      shipping_discount_amount: p.shippingDiscountAmount,
      shipping_promotion_id: p.shippingPromotionId,
      remote_area_fee: p.remoteAreaFee,
      promotion_code_id: p.promotionCodeId,
      promotion_discount_amount: p.promotionDiscountAmount,
      original_total_price: p.originalTotalPrice,
      repair_parts: p.repairParts,
      images_with_pins: p.imagesWithPins,
      images: p.imageUrls ? { urls: p.imageUrls } : null,
    };

    // 8) orders insert (없는 컬럼은 자동 제거 후 재시도 — orders-free 와 동일 패턴)
    let inserted: { id: string } | null = null;
    let lastErr: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const r = await admin.from('orders').insert(insertData).select('id').single();
      if (!r.error) {
        inserted = r.data as { id: string };
        break;
      }
      lastErr = r.error as { code?: string; message?: string };
      const m =
        (lastErr.message || '').match(/Could not find the '(.+?)' column/) ||
        (lastErr.message || '').match(/column "(.+?)" of relation/);
      if (lastErr.code === 'PGRST204' && m?.[1]) {
        delete insertData[m[1]];
        continue;
      }
      break;
    }

    if (!inserted) {
      console.error('[payments-test-skip] 주문 생성 실패:', lastErr);
      return errorResponse(
        `주문 생성 실패: ${lastErr?.message ?? 'unknown'}`,
        500,
        'ORDER_INSERT_FAILED'
      );
    }

    // 9) intent consume 마킹 (멱등 보호)
    await admin
      .from('payment_intents')
      .update({
        consumed_at: new Date().toISOString(),
        consumed_order_id: inserted.id,
      })
      .eq('id', intentId);

    // 10) 우체국 수거 예약 호출 (shipments-book 내부 호출)
    //     주소 또는 고객 정보가 없으면 수거 예약을 건너뛴다 (웹 동일 조건).
    let trackingNo: string | null = null;
    let bookErrorMessage: string | null = null;

    const pickupAddr = ((p.pickupAddress as string) ?? '').trim();
    const custName = ((p.customerName as string) ?? '').trim();
    const shouldSkipShipment = !pickupAddr || !custName;

    if (shouldSkipShipment) {
      console.log('[payments-test-skip] 수거 예약 스킵: 주소 또는 고객 정보 없음');
    } else {
      try {
        const bookRes = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
          body: JSON.stringify({
            order_id: inserted.id,
            customer_name: custName,
            pickup_address: pickupAddr,
            pickup_phone: p.pickupPhone ?? '010-1234-5678',
            pickup_zipcode: (p.pickupZipcode as string) ?? '',
            delivery_address: p.deliveryAddress ?? pickupAddr,
            delivery_phone: p.deliveryPhone ?? p.pickupPhone ?? '010-1234-5678',
            delivery_zipcode: (p.deliveryZipcode as string) ?? '',
            delivery_message: (p.notes as string) ?? '',
            test_mode: testMode,
          }),
        });
        const bookData = await bookRes.json();
        if (bookRes.ok) {
          trackingNo =
            bookData?.data?.tracking_no ?? bookData?.data?.pickup_tracking_no ?? null;
        } else {
          bookErrorMessage = bookData?.error ?? '수거 예약 실패';
          console.error('[payments-test-skip] 수거 예약 실패:', bookData);
        }
      } catch (e) {
        bookErrorMessage = e instanceof Error ? e.message : String(e);
        console.error('[payments-test-skip] 수거 예약 호출 오류:', e);
      }
    }

    return successResponse({
      orderId: inserted.id,
      trackingNo,
      testMode,
      bookErrorMessage,
      shipmentSkipped: shouldSkipShipment,
    });
  } catch (e: any) {
    console.error('[payments-test-skip] error:', e);
    return errorResponse(e?.message ?? 'Internal server error', 500);
  }
});
