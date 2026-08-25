/**
 * 우체국 수거예약 재시도 + 관리자 실패 알림
 *
 * 결제 직후 shipments-book 이 실패해도 결제는 유지된다.
 * 이 헬퍼가 즉시 재시도하고, 그래도 실패하면 스태프에게 남긴다.
 * reconcile-pickup-bookings cron 이 이후에도 다시 시도한다.
 */

export type BookPickupResult = {
  ok: boolean;
  trackingNo?: string | null;
  error?: string;
  code?: string;
  attempts: number;
};

const PERMANENT_CODES = new Set([
  'ALREADY_BOOKED',
  'MISSING_FIELDS',
  'ORDER_NOT_FOUND',
  'SAME_ADDRESS_ERROR',
  'MISSING_ZIPCODE',
  'INVALID_ZIPCODE',
  'MISSING_ENV',
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBookResponse(status: number, data: any): {
  ok: boolean;
  trackingNo?: string | null;
  error?: string;
  code?: string;
} {
  const code = typeof data?.code === 'string' ? data.code : undefined;
  if (code === 'ALREADY_BOOKED' || (status === 400 && /already booked/i.test(String(data?.error ?? '')))) {
    return {
      ok: true,
      trackingNo: data?.data?.tracking_no ?? data?.data?.pickup_tracking_no ?? null,
      code: 'ALREADY_BOOKED',
    };
  }
  if (status >= 200 && status < 300 && data?.success) {
    return {
      ok: true,
      trackingNo: data?.data?.tracking_no ?? data?.data?.pickup_tracking_no ?? null,
      code,
    };
  }
  return {
    ok: false,
    error: data?.error || `shipments-book HTTP ${status}`,
    code: code || `HTTP_${status}`,
  };
}

export async function bookPickupWithRetry(opts: {
  orderId: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}): Promise<BookPickupResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'SUPABASE_URL/SERVICE_ROLE_KEY 없음', code: 'MISSING_ENV', attempts: 0 };
  }

  let last: BookPickupResult = { ok: false, error: '수거예약 호출 전', attempts: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          order_id: opts.orderId,
          test_mode: false,
          ...(opts.payload ?? {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      const parsed = parseBookResponse(res.status, data);
      last = { ...parsed, attempts: attempt };

      if (parsed.ok) {
        console.log(`[book-pickup] 성공 order=${opts.orderId} attempt=${attempt} tracking=${parsed.trackingNo ?? ''}`);
        return last;
      }

      console.error(`[book-pickup] 실패 order=${opts.orderId} attempt=${attempt}`, parsed);
      if (parsed.code && PERMANENT_CODES.has(parsed.code)) {
        return last;
      }
    } catch (e) {
      last = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        code: 'NETWORK_ERROR',
        attempts: attempt,
      };
      console.error(`[book-pickup] 예외 order=${opts.orderId} attempt=${attempt}`, last.error);
    }

    if (attempt < maxAttempts) {
      await sleep(1000 * attempt); // 1s, 2s — 결제 확인이 타임아웃 나지 않게
    }
  }

  return last;
}

type SupabaseLike = {
  from: (table: string) => any;
};

export async function notifyStaffPickupBookFailed(
  supabase: SupabaseLike,
  params: {
    orderId: string;
    orderNumber?: string | null;
    customerName?: string | null;
    error?: string;
  },
): Promise<void> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  try {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('order_id', params.orderId)
      .eq('type', 'SYSTEM')
      .gte('created_at', since)
      .ilike('title', '%수거송장%')
      .limit(1);
    if (existing && existing.length > 0) {
      console.log(`[book-pickup] 관리자 알림 생략(6시간 내 중복) order=${params.orderId}`);
      return;
    }
  } catch (e) {
    console.warn('[book-pickup] 중복 알림 조회 실패(무시):', e);
  }

  const { data: staff, error: staffErr } = await supabase
    .from('users')
    .select('id')
    .in('role', ['ADMIN', 'SUPER_ADMIN', 'MANAGER']);

  if (staffErr || !staff?.length) {
    console.warn('[book-pickup] 스태프 조회 실패:', staffErr?.message);
    return;
  }

  const orderLabel = params.orderNumber || params.orderId;
  const who = params.customerName ? ` (${params.customerName})` : '';
  const detail = params.error ? ` 사유: ${params.error}` : '';

  const { error: insertErr } = await supabase.from('notifications').insert(
    staff.map((row: { id: string }) => ({
      user_id: row.id,
      type: 'SYSTEM',
      title: '수거송장 미발행',
      body: `주문 ${orderLabel}${who} 결제는 됐지만 수거예약에 실패했습니다.${detail} 자동 재시도를 확인하고, 필요하면 주문 상세에서 재발행하세요.`,
      order_id: params.orderId,
    })),
  );

  if (insertErr) {
    console.error('[book-pickup] 관리자 알림 저장 실패:', insertErr.message);
  }
}
