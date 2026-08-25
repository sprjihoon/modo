export function parseShipmentsBookResult(status: number, data: any): {
  ok: boolean;
  trackingNo?: string | null;
  error?: string;
  code?: string;
} {
  const code = typeof data?.code === "string" ? data.code : undefined;
  if (code === "ALREADY_BOOKED" || (status === 400 && /already booked/i.test(String(data?.error ?? "")))) {
    return {
      ok: true,
      trackingNo: data?.data?.tracking_no ?? data?.data?.pickup_tracking_no ?? null,
      code: "ALREADY_BOOKED",
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

type BookPickupResult = {
  ok: boolean;
  trackingNo?: string | null;
  error?: string;
  code?: string;
  attempts: number;
};

const PERMANENT_CODES = new Set([
  "ALREADY_BOOKED",
  "MISSING_FIELDS",
  "ORDER_NOT_FOUND",
  "SAME_ADDRESS_ERROR",
  "MISSING_ZIPCODE",
  "INVALID_ZIPCODE",
  "MISSING_ENV",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function bookPickupForOrder(
  order: {
    id: string;
    customer_name?: string | null;
    pickup_address?: string | null;
    pickup_address_detail?: string | null;
    pickup_zipcode?: string | null;
    pickup_phone?: string | null;
    customer_phone?: string | null;
    delivery_address?: string | null;
    delivery_address_detail?: string | null;
    delivery_zipcode?: string | null;
    delivery_phone?: string | null;
    notes?: string | null;
    item_name?: string | null;
  },
  extra?: Record<string, unknown>,
  maxAttempts = 3
): Promise<BookPickupResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: "서버 환경변수가 없습니다.", code: "MISSING_ENV", attempts: 0 };
  }

  let last: BookPickupResult = { ok: false, error: "수거예약 호출 전", attempts: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/shipments-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          order_id: order.id,
          customer_name: order.customer_name || "",
          pickup_address: order.pickup_address || "",
          pickup_address_detail: order.pickup_address_detail || "",
          pickup_zipcode: order.pickup_zipcode || "",
          pickup_phone: order.pickup_phone || order.customer_phone || "",
          delivery_address: order.delivery_address || order.pickup_address || "",
          delivery_address_detail: order.delivery_address_detail || order.pickup_address_detail || "",
          delivery_zipcode: order.delivery_zipcode || order.pickup_zipcode || "",
          delivery_phone: order.delivery_phone || order.customer_phone || "",
          delivery_message: order.notes || "",
          goods_name: order.item_name || undefined,
          test_mode: false,
          ...extra,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const parsed = parseShipmentsBookResult(res.status, data);
      last = { ...parsed, attempts: attempt };
      if (parsed.ok) return last;
      if (parsed.code && PERMANENT_CODES.has(parsed.code)) return last;
    } catch (e) {
      last = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        code: "NETWORK_ERROR",
        attempts: attempt,
      };
    }
    if (attempt < maxAttempts) {
      await sleep(1000 * attempt);
    }
  }

  return last;
}
