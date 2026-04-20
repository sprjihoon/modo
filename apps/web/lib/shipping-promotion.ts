// 하위 호환을 위한 재-export
// 신규 코드는 직접 "@/lib/shipping-settings"를 사용하세요.
export {
  BASE_SHIPPING_FEE,
  DEFAULT_SHIPPING_SETTINGS,
  getShippingSettings,
  invalidateShippingSettingsCache,
  type ShippingSettings,
  type ShippingPromoResult,
} from "@/lib/shipping-settings";
