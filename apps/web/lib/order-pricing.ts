// 주문 가격 계산 공통 헬퍼
// - POST /api/orders/quote, POST /api/orders/free 가 공유
// - 권위적 가격 계산은 서버에서만 수행 (클라이언트 입력 신뢰 X)

import { createClient } from "@/lib/supabase/server";
import { getRemoteAreaFee } from "@/lib/remote-area";
import { getShippingSettings } from "@/lib/shipping-settings";

export interface RepairPart {
  name: string;
  price?: number;
  quantity?: number;
  detail?: string;
}

export interface OrderInputItem {
  clothingType?: string;
  clothingCategoryId?: string;
  repairItems?: RepairPart[];
  imagesWithPins?: Array<{ imageUrl: string; pins?: unknown[] }>;
}

export interface OrderQuoteInput {
  items?: OrderInputItem[];
  // 레거시 단일 형식 (호환)
  clothingType?: string;
  repairItems?: RepairPart[];
  imagesWithPins?: Array<{ imageUrl: string; pins?: unknown[] }>;

  pickupAddress?: string;
  pickupAddressDetail?: string;
  pickupZipcode?: string;
  pickupDate?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryAddressDetail?: string;
  deliveryZipcode?: string;
  promotionCodeId?: string;
}

export interface OrderQuoteResult {
  // 가격
  totalPrice: number;
  repairItemsTotal: number;
  baseShippingFee: number;
  shippingFee: number;
  shippingDiscountAmount: number;
  shippingPromotionId: string | null;
  remoteAreaFee: number;
  promotionDiscountAmount: number;
  verifiedPromotionCodeId: string | null;
  originalTotalPrice: number;

  // payment_intents.payload 에 그대로 저장될 정규화된 페이로드
  // (edge function 이 orders insert 시 사용)
  pickupPayload: {
    itemName: string;
    clothingType: string;
    repairType: string;
    repairParts: RepairPart[] | null;
    imagesWithPins: Array<{ imageUrl: string; pins?: unknown[] }> | null;
    imageUrls: string[] | null;

    pickupAddress: string;
    pickupAddressDetail: string | null;
    pickupZipcode: string | null;
    pickupPhone: string;
    pickupDate: string | null;

    deliveryAddress: string;
    deliveryAddressDetail: string | null;
    deliveryZipcode: string | null;
    deliveryPhone: string;

    customerName: string;
    customerEmail: string | null;
    customerPhone: string;

    notes: string | null;

    basePrice: number;
    shippingFee: number;
    shippingDiscountAmount: number;
    shippingPromotionId: string | null;
    remoteAreaFee: number;
    promotionCodeId: string | null;
    promotionDiscountAmount: number;
    originalTotalPrice: number;
  };
}

export interface AuthorizedUser {
  authId: string;
  internalUserId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * 인증된 사용자에 대해 주문 가격을 권위적으로 계산하고
 * 정규화된 페이로드를 반환한다.
 */
export async function quoteOrder(
  user: AuthorizedUser,
  input: OrderQuoteInput
): Promise<OrderQuoteResult> {
  const supabase = await createClient();

  const itemsArr: OrderInputItem[] = Array.isArray(input.items) ? input.items : [];

  const clothingType = itemsArr[0]?.clothingType ?? input.clothingType ?? "";
  const repairItems: RepairPart[] = itemsArr.length > 0
    ? itemsArr.flatMap((it) => it.repairItems ?? [])
    : (input.repairItems ?? []);
  const imagesWithPins = itemsArr.length > 0
    ? itemsArr.flatMap((it) => it.imagesWithPins ?? [])
    : (input.imagesWithPins ?? []);

  const itemName = repairItems.map((i) => i.name).join(", ") || clothingType || "수선";
  const repairType = repairItems[0]?.name || "기타";

  const shippingSettings = await getShippingSettings();
  const BASE_SHIPPING_FEE = shippingSettings.baseShippingFee;

  const repairItemsTotal = repairItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
    0
  );

  // 배송비 프로모션
  let shippingFee = BASE_SHIPPING_FEE;
  let shippingDiscountAmount = 0;
  let shippingPromotionId: string | null = null;

  try {
    const now = new Date().toISOString();
    const { data: promotions } = await supabase
      .from("shipping_promotions")
      .select("*")
      .eq("is_active", true)
      .lte("valid_from", now)
      .or(`valid_until.is.null,valid_until.gte.${now}`);

    if (promotions && promotions.length > 0) {
      const hasFirstOrderPromo = promotions.some((p) => p.type === "FIRST_ORDER");
      let isFirstOrder = false;

      if (hasFirstOrderPromo) {
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.internalUserId)
          .neq("status", "CANCELLED");
        isFirstOrder = (count ?? 0) === 0;
      }

      let bestDiscount = 0;
      let bestPromoId: string | null = null;

      for (const promo of promotions) {
        let eligible = false;
        switch (promo.type) {
          case "FIRST_ORDER": eligible = isFirstOrder; break;
          case "FREE_ABOVE_AMOUNT": eligible = repairItemsTotal >= (promo.min_order_amount ?? 0); break;
          case "PERCENTAGE_OFF":
          case "FIXED_DISCOUNT": eligible = repairItemsTotal >= (promo.min_order_amount ?? 0); break;
        }
        if (!eligible) continue;

        let discountAmt = promo.discount_type === "PERCENTAGE"
          ? Math.round(BASE_SHIPPING_FEE * promo.discount_value / 100)
          : promo.discount_value;

        if (promo.max_discount_amount != null) discountAmt = Math.min(discountAmt, promo.max_discount_amount);
        discountAmt = Math.min(discountAmt, BASE_SHIPPING_FEE);

        if (discountAmt > bestDiscount) {
          bestDiscount = discountAmt;
          bestPromoId = promo.id;
        }
      }

      shippingDiscountAmount = bestDiscount;
      shippingFee = BASE_SHIPPING_FEE - bestDiscount;
      shippingPromotionId = bestPromoId;
    }
  } catch (e) {
    console.warn("배송비 프로모션 확인 실패 (기본 배송비 적용):", e);
  }

  // 도서산간 추가비
  const remoteAreaFee = getRemoteAreaFee(
    input.pickupZipcode || "",
    input.pickupAddress || "",
    shippingSettings.remoteAreaFee
  );

  // 프로모션 코드 할인 검증
  let promotionDiscountAmount = 0;
  let verifiedPromotionCodeId: string | null = null;
  if (input.promotionCodeId) {
    try {
      const { data: promo } = await supabase
        .from("promotion_codes")
        .select("*")
        .eq("id", input.promotionCodeId)
        .eq("is_active", true)
        .maybeSingle();
      if (promo) {
        let calc = promo.discount_type === "PERCENTAGE"
          ? Math.round(repairItemsTotal * promo.discount_value / 100)
          : promo.discount_value;
        if (promo.max_discount_amount != null) calc = Math.min(calc, promo.max_discount_amount);
        calc = Math.min(calc, repairItemsTotal);
        promotionDiscountAmount = calc;
        verifiedPromotionCodeId = promo.id;
      }
    } catch (e) {
      console.warn("프로모션 코드 검증 실패:", e);
    }
  }

  const repairFinalPrice = repairItemsTotal - promotionDiscountAmount;
  const totalPrice = repairFinalPrice + shippingFee + remoteAreaFee;
  const originalTotalPrice = repairItemsTotal + shippingFee + remoteAreaFee;

  const finalDeliveryAddress = input.deliveryAddress || input.pickupAddress || "";
  const finalDeliveryAddressDetail = input.deliveryAddressDetail || input.pickupAddressDetail || null;
  const finalDeliveryZipcode = input.deliveryZipcode || input.pickupZipcode || null;
  const phone = user.phone || "010-0000-0000";

  return {
    totalPrice,
    repairItemsTotal,
    baseShippingFee: BASE_SHIPPING_FEE,
    shippingFee,
    shippingDiscountAmount,
    shippingPromotionId,
    remoteAreaFee,
    promotionDiscountAmount,
    verifiedPromotionCodeId,
    originalTotalPrice,
    pickupPayload: {
      itemName,
      clothingType: clothingType || "기타",
      repairType,
      repairParts: repairItems.length > 0 ? repairItems : null,
      imagesWithPins: imagesWithPins.length > 0 ? imagesWithPins : null,
      imageUrls: imagesWithPins.length > 0 ? imagesWithPins.map((i) => i.imageUrl) : null,

      pickupAddress: input.pickupAddress || "",
      pickupAddressDetail: input.pickupAddressDetail || null,
      pickupZipcode: input.pickupZipcode || null,
      pickupPhone: phone,
      pickupDate: input.pickupDate || null,

      deliveryAddress: finalDeliveryAddress,
      deliveryAddressDetail: finalDeliveryAddressDetail,
      deliveryZipcode: finalDeliveryZipcode,
      deliveryPhone: phone,

      customerName: user.name || "고객",
      customerEmail: user.email,
      customerPhone: phone,

      notes: input.notes || null,

      basePrice: repairItemsTotal,
      shippingFee: BASE_SHIPPING_FEE,
      shippingDiscountAmount,
      shippingPromotionId,
      remoteAreaFee,
      promotionCodeId: verifiedPromotionCodeId,
      promotionDiscountAmount,
      originalTotalPrice,
    },
  };
}

/**
 * 인증된 사용자 정보를 조회한다. (auth_id → users.id 매핑)
 */
export async function getAuthorizedUser(): Promise<AuthorizedUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select("id, name, phone, email")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!userRow) return null;

  return {
    authId: user.id,
    internalUserId: userRow.id as string,
    name: (userRow.name as string) ?? null,
    phone: (userRow.phone as string) ?? null,
    email: (userRow.email as string) ?? user.email ?? null,
  };
}
