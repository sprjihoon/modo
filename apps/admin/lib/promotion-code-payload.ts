type DiscountType = "PERCENTAGE" | "FIXED";

export type PromotionWritePayload = {
  code?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  description?: string | null;
  is_active?: boolean;
  includes_free_shipping?: boolean;
};

export type PromotionInsertPayload = {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  max_uses_per_user: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  valid_from: string;
  valid_until: string | null;
  description: string | null;
  is_active: boolean;
  includes_free_shipping: boolean;
};

function asNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDiscountType(value: unknown): DiscountType | null {
  return value === "PERCENTAGE" || value === "FIXED" ? value : null;
}

export function asIncludesFreeShipping(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function validateDiscount(type: DiscountType, value: number): string | null {
  if (value <= 0) return "할인 값은 0보다 커야 합니다.";
  if (type === "PERCENTAGE" && value > 100) return "퍼센트 할인은 100 이하여야 합니다.";
  return null;
}

export function buildPromotionInsert(
  body: Record<string, unknown>
): PromotionInsertPayload | { error: string } {
  const code = String(body.code ?? "").toUpperCase().trim();
  if (!code) return { error: "프로모션 코드는 필수입니다." };

  const discount_type = asDiscountType(body.discount_type) ?? "PERCENTAGE";
  const discount_value = asNumber(body.discount_value);
  if (discount_value == null) return { error: "할인 값은 필수입니다." };
  const discountError = validateDiscount(discount_type, discount_value);
  if (discountError) return { error: discountError };

  const max_uses = asNumber(body.max_uses);
  if (body.max_uses !== "" && body.max_uses != null && (max_uses == null || max_uses <= 0)) {
    return { error: "최대 사용 횟수는 1 이상이어야 합니다." };
  }

  const max_uses_per_user = asNumber(body.max_uses_per_user) ?? 1;
  if (max_uses_per_user < 1) return { error: "사용자당 최대 사용 횟수는 1 이상이어야 합니다." };

  const min_order_amount = asNumber(body.min_order_amount) ?? 0;
  if (min_order_amount < 0) return { error: "최소 주문 금액은 0 이상이어야 합니다." };

  const max_discount_amount = asNumber(body.max_discount_amount);
  if (
    body.max_discount_amount !== "" &&
    body.max_discount_amount != null &&
    (max_discount_amount == null || max_discount_amount <= 0)
  ) {
    return { error: "최대 할인 금액은 1 이상이어야 합니다." };
  }

  const valid_from = body.valid_from
    ? new Date(String(body.valid_from)).toISOString()
    : new Date().toISOString();

  return {
    code,
    discount_type,
    discount_value,
    max_uses: max_uses && max_uses > 0 ? max_uses : null,
    max_uses_per_user,
    min_order_amount,
    max_discount_amount: max_discount_amount && max_discount_amount > 0 ? max_discount_amount : null,
    valid_from,
    valid_until: body.valid_until ? new Date(String(body.valid_until)).toISOString() : null,
    description: body.description ? String(body.description).trim() || null : null,
    is_active: body.is_active !== false,
    includes_free_shipping: asIncludesFreeShipping(body.includes_free_shipping),
  };
}

export function buildPromotionUpdate(
  body: Record<string, unknown>
): PromotionWritePayload | { error: string } {
  const payload: PromotionWritePayload = {};

  if (body.code !== undefined) {
    const code = String(body.code).toUpperCase().trim();
    if (!code) return { error: "프로모션 코드는 필수입니다." };
    payload.code = code;
  }

  if (body.discount_type !== undefined) {
    const discount_type = asDiscountType(body.discount_type);
    if (!discount_type) return { error: "할인 타입이 올바르지 않습니다." };
    payload.discount_type = discount_type;
  }

  if (body.discount_value !== undefined) {
    const discount_value = asNumber(body.discount_value);
    if (discount_value == null) return { error: "할인 값이 올바르지 않습니다." };
    payload.discount_value = discount_value;
  }

  const type = payload.discount_type ?? asDiscountType(body.discount_type);
  const value = payload.discount_value ?? asNumber(body.discount_value);
  if (type && value != null) {
    const discountError = validateDiscount(type, value);
    if (discountError) return { error: discountError };
  }

  if (body.max_uses !== undefined) {
    if (body.max_uses === "" || body.max_uses == null) {
      payload.max_uses = null;
    } else {
      const max_uses = asNumber(body.max_uses);
      if (max_uses == null || max_uses <= 0) return { error: "최대 사용 횟수는 1 이상이어야 합니다." };
      payload.max_uses = max_uses;
    }
  }

  if (body.max_uses_per_user !== undefined) {
    const max_uses_per_user = asNumber(body.max_uses_per_user);
    if (max_uses_per_user == null || max_uses_per_user < 1) {
      return { error: "사용자당 최대 사용 횟수는 1 이상이어야 합니다." };
    }
    payload.max_uses_per_user = max_uses_per_user;
  }

  if (body.min_order_amount !== undefined) {
    const min_order_amount = asNumber(body.min_order_amount);
    if (min_order_amount == null || min_order_amount < 0) {
      return { error: "최소 주문 금액은 0 이상이어야 합니다." };
    }
    payload.min_order_amount = min_order_amount;
  }

  if (body.max_discount_amount !== undefined) {
    if (body.max_discount_amount === "" || body.max_discount_amount == null) {
      payload.max_discount_amount = null;
    } else {
      const max_discount_amount = asNumber(body.max_discount_amount);
      if (max_discount_amount == null || max_discount_amount <= 0) {
        return { error: "최대 할인 금액은 1 이상이어야 합니다." };
      }
      payload.max_discount_amount = max_discount_amount;
    }
  }

  if (body.valid_from !== undefined) {
    payload.valid_from = new Date(String(body.valid_from)).toISOString();
  }
  if (body.valid_until !== undefined) {
    payload.valid_until = body.valid_until
      ? new Date(String(body.valid_until)).toISOString()
      : null;
  }
  if (body.description !== undefined) {
    payload.description = body.description ? String(body.description).trim() || null : null;
  }
  if (body.is_active !== undefined) {
    payload.is_active = Boolean(body.is_active);
  }
  if (body.includes_free_shipping !== undefined) {
    payload.includes_free_shipping = asIncludesFreeShipping(body.includes_free_shipping);
  }

  return payload;
}

export function uniqueCodeError(error: { code?: string; message?: string }): string | null {
  if (error.code === "23505" || error.message?.includes("promotion_codes_code")) {
    return "이미 사용 중인 프로모션 코드입니다.";
  }
  return null;
}
