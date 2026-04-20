import { createClient as createServerSupabase } from "@/lib/supabase/server";

export interface ShippingSettings {
  baseShippingFee: number;
  remoteAreaFee: number;
  returnShippingFee: number;
}

// 폴백 기본값 (DB 조회 실패 시)
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  baseShippingFee: 7000,
  remoteAreaFee: 400,
  returnShippingFee: 7000,
};

/**
 * @deprecated 가능하면 getShippingSettings() 사용. UI에서 폴백/초깃값 용도로만.
 */
export const BASE_SHIPPING_FEE = DEFAULT_SHIPPING_SETTINGS.baseShippingFee;

export interface ShippingPromoResult {
  baseShippingFee: number;
  discountAmount: number;
  finalShippingFee: number;
  promotionId: string | null;
  promotionName: string | null;
  promotionDescription: string | null;
}

let cached: { value: ShippingSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1분 캐시 (관리자 변경 후 최대 60초 안에 반영)

/**
 * shipping_settings 테이블에서 글로벌 설정을 읽어온다.
 * - 서버 컴포넌트/Route Handler 전용 (createClient는 서버 supabase 사용)
 * - 60초 in-memory 캐시
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const supabase = createServerSupabase();
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
      baseShippingFee: data.base_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.baseShippingFee,
      remoteAreaFee: data.remote_area_fee ?? DEFAULT_SHIPPING_SETTINGS.remoteAreaFee,
      returnShippingFee: data.return_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.returnShippingFee,
    };
    cached = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    cached = { value: DEFAULT_SHIPPING_SETTINGS, expiresAt: now + 5_000 };
    return DEFAULT_SHIPPING_SETTINGS;
  }
}

/** 관리자 페이지에서 값 변경 직후 호출하여 캐시를 무효화 */
export function invalidateShippingSettingsCache() {
  cached = null;
}
