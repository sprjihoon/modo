export const BASE_SHIPPING_FEE = 7000;

export interface ShippingPromoResult {
  baseShippingFee: number;
  discountAmount: number;
  finalShippingFee: number;
  promotionId: string | null;
  promotionName: string | null;
  promotionDescription: string | null;
}
