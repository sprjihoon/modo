import { getSupabaseAdmin } from "@/lib/supabase";

export interface ShippingSettings {
  baseShippingFee: number;
  remoteAreaFee: number;
  returnShippingFee: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  baseShippingFee: 7000,
  remoteAreaFee: 400,
  returnShippingFee: 7000,
};

let cached: { value: ShippingSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * shipping_settings 테이블에서 글로벌 설정을 읽어온다.
 * - Route Handler 전용 (service role)
 * - 60초 in-memory 캐시
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("base_shipping_fee, remote_area_fee, return_shipping_fee")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      cached = { value: DEFAULT_SHIPPING_SETTINGS, expiresAt: now + 5_000 };
      return DEFAULT_SHIPPING_SETTINGS;
    }

    const value: ShippingSettings = {
      baseShippingFee:
        data.base_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.baseShippingFee,
      remoteAreaFee:
        data.remote_area_fee ?? DEFAULT_SHIPPING_SETTINGS.remoteAreaFee,
      returnShippingFee:
        data.return_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.returnShippingFee,
    };
    cached = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    cached = { value: DEFAULT_SHIPPING_SETTINGS, expiresAt: now + 5_000 };
    return DEFAULT_SHIPPING_SETTINGS;
  }
}

export function invalidateShippingSettingsCache() {
  cached = null;
}
