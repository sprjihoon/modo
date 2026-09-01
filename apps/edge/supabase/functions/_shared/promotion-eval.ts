/** 앱 promotion_rules.dart · web/lib/promotion-eval.ts 와 같은 견적 규칙 */

export function isPaidPromoOrder(order: {
  payment_status?: string | null
  paid_at?: string | null
}): boolean {
  const payment = String(order.payment_status || '').toUpperCase()
  if (['FAILED', 'CANCELED', 'REFUNDED', 'PENDING'].includes(payment)) return false
  return Boolean(order.paid_at) || ['PAID', 'PARTIAL_CANCELED', 'COMPLETED', 'DONE'].includes(payment)
}

export function resolvePromoUsageCounts(input: {
  usedCount: number
  paidOrders: Array<{
    user_id?: string | null
    payment_status?: string | null
    paid_at?: string | null
  }>
  usageRows?: Array<{ user_id?: string | null }>
  currentUserId: string
}): { totalUses: number; userUses: number } {
  const paid = input.paidOrders.filter(isPaidPromoOrder)
  const paidUser = paid.filter((order) => order.user_id === input.currentUserId).length
  const usageUser = (input.usageRows || []).filter((row) => row.user_id === input.currentUserId).length
  return {
    totalUses: Math.max(input.usedCount || 0, paid.length),
    userUses: Math.max(paidUser, usageUser),
  }
}

export function exclusiveCouponOwnerOk(
  assignedUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!assignedUserId) return true
  return Boolean(currentUserId) && assignedUserId === currentUserId
}

export function calculatePromotionDiscount(input: {
  orderAmount: number
  discountType: string
  discountValue: number
  maxDiscountAmount?: number | null
}): number {
  let discountAmount = input.discountType === 'PERCENTAGE'
    ? Math.round((input.orderAmount * input.discountValue) / 100)
    : input.discountValue
  if (input.maxDiscountAmount != null && discountAmount > input.maxDiscountAmount) {
    discountAmount = input.maxDiscountAmount
  }
  if (discountAmount > input.orderAmount) discountAmount = input.orderAmount
  if (discountAmount < 0) discountAmount = 0
  return discountAmount
}

export type PromotionEvalResult =
  | { ok: true; discountAmount: number }
  | { ok: false; error: string }

export function evaluatePromotionCode(input: {
  now: Date
  orderAmount: number
  isActive: boolean
  validFrom: Date
  validUntil?: Date | null
  minOrderAmount?: number
  maxUses?: number | null
  usedCount?: number
  maxUsesPerUser?: number
  userUsageCount?: number
  discountType: string
  discountValue: number
  maxDiscountAmount?: number | null
  assignedUserId?: string | null
  currentUserId?: string | null
}): PromotionEvalResult {
  if (!exclusiveCouponOwnerOk(input.assignedUserId, input.currentUserId)) {
    return { ok: false, error: '이 코드는 사용할 수 없습니다.' }
  }
  if (!input.isActive) {
    return { ok: false, error: '유효하지 않은 프로모션 코드입니다.' }
  }
  if (input.now < input.validFrom) {
    return { ok: false, error: '아직 사용할 수 없는 프로모션 코드입니다.' }
  }
  if (input.validUntil && input.now > input.validUntil) {
    return { ok: false, error: '만료된 프로모션 코드입니다.' }
  }
  const minOrder = input.minOrderAmount ?? 0
  if (input.orderAmount < minOrder) {
    return { ok: false, error: '최소 주문 금액 미달' }
  }
  if (input.maxUses != null && (input.usedCount ?? 0) >= input.maxUses) {
    return { ok: false, error: '프로모션 코드 사용 가능 횟수가 초과되었습니다.' }
  }
  if ((input.userUsageCount ?? 0) >= (input.maxUsesPerUser ?? 1)) {
    return { ok: false, error: '이미 사용한 프로모션 코드입니다.' }
  }
  return {
    ok: true,
    discountAmount: calculatePromotionDiscount({
      orderAmount: input.orderAmount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount,
    }),
  }
}
