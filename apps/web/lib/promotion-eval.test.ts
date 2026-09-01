import {
  calculatePromotionDiscount,
  classifyWalletCoupon,
  couponBlocksPoints,
  evaluatePromotionCode,
  exclusiveCouponOwnerOk,
  isPaidPromoOrder,
  promotionCodesAllowedOnOrderSource,
  resolvePromoUsageCounts,
} from "./promotion-eval";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const now = new Date("2026-09-01T12:00:00.000Z");

assert(exclusiveCouponOwnerOk(null, "u1"), "공개는 누구나");
assert(exclusiveCouponOwnerOk("u1", "u1"), "본인 전용");
assert(!exclusiveCouponOwnerOk("u1", "u2"), "타인 전용 거절");
assert(!exclusiveCouponOwnerOk("u1", null), "비로그인 전용 거절");

assert(isPaidPromoOrder({ payment_status: "PAID" }), "PAID");
assert(isPaidPromoOrder({ paid_at: "2026-09-01T00:00:00.000Z" }), "paid_at");
assert(!isPaidPromoOrder({ payment_status: "PENDING" }), "PENDING 제외");
assert(!isPaidPromoOrder({ payment_status: "CANCELED", paid_at: "2026-09-01T00:00:00.000Z" }), "취소 제외");
assert(!isPaidPromoOrder({ payment_status: "REFUNDED" }), "환불 제외");

const counts = resolvePromoUsageCounts({
  usedCount: 2,
  currentUserId: "u1",
  paidOrders: [
    { user_id: "u1", payment_status: "PAID" },
    { user_id: "u2", payment_status: "PAID" },
    { user_id: "u1", payment_status: "CANCELED" },
  ],
  usageRows: [{ user_id: "u1" }, { user_id: "u1" }],
});
assert(counts.totalUses === 2, "전체 사용은 used_count와 결제 건 중 큰 값(취소 제외)");
assert(counts.userUses === 2, "본인 사용은 결제 1과 이력 2 중 큰 값이지 합이 아님");

const sameOrder = resolvePromoUsageCounts({
  usedCount: 1,
  currentUserId: "u1",
  paidOrders: [{ user_id: "u1", payment_status: "PAID" }],
  usageRows: [{ user_id: "u1" }],
});
assert(sameOrder.totalUses === 1 && sameOrder.userUses === 1, "같은 주문 이력+결제는 1로 센다");

assert(calculatePromotionDiscount({ orderAmount: 30000, discountType: "PERCENTAGE", discountValue: 10 }) === 3000, "10%");
assert(
  calculatePromotionDiscount({
    orderAmount: 100000,
    discountType: "PERCENTAGE",
    discountValue: 50,
    maxDiscountAmount: 10000,
  }) === 10000,
  "최대 할인 캡"
);
assert(calculatePromotionDiscount({ orderAmount: 3000, discountType: "FIXED", discountValue: 5000 }) === 3000, "고정은 주문액 초과 불가");

const expired = evaluatePromotionCode({
  now,
  orderAmount: 30000,
  isActive: true,
  validFrom: new Date("2026-08-01T00:00:00.000Z"),
  validUntil: new Date("2026-08-31T00:00:00.000Z"),
  discountType: "FIXED",
  discountValue: 5000,
});
assert(!expired.ok && expired.error.includes("만료"), "만료 거절");

const tooSoon = evaluatePromotionCode({
  now,
  orderAmount: 30000,
  isActive: true,
  validFrom: new Date("2026-10-01T00:00:00.000Z"),
  discountType: "FIXED",
  discountValue: 5000,
});
assert(!tooSoon.ok, "시작 전 거절");

const minFail = evaluatePromotionCode({
  now,
  orderAmount: 9000,
  isActive: true,
  validFrom: new Date("2026-08-01T00:00:00.000Z"),
  minOrderAmount: 10000,
  discountType: "FIXED",
  discountValue: 5000,
});
assert(!minFail.ok, "최소 주문 거절");

const cap = evaluatePromotionCode({
  now,
  orderAmount: 30000,
  isActive: true,
  validFrom: new Date("2026-08-01T00:00:00.000Z"),
  maxUses: 10,
  usedCount: 10,
  discountType: "FIXED",
  discountValue: 5000,
});
assert(!cap.ok, "전체 한도 초과");

const perUser = evaluatePromotionCode({
  now,
  orderAmount: 30000,
  isActive: true,
  validFrom: new Date("2026-08-01T00:00:00.000Z"),
  maxUsesPerUser: 1,
  userUsageCount: 1,
  discountType: "FIXED",
  discountValue: 5000,
});
assert(!perUser.ok, "1인 1회 초과");

const ok = evaluatePromotionCode({
  now,
  orderAmount: 30000,
  isActive: true,
  validFrom: new Date("2026-08-01T00:00:00.000Z"),
  assignedUserId: "u1",
  currentUserId: "u1",
  discountType: "FIXED",
  discountValue: 5000,
});
assert(ok.ok && ok.discountAmount === 5000, "본인 전용 적용");

assert(!couponBlocksPoints({}), "쿠폰 없으면 포인트 가능");
assert(couponBlocksPoints({ promotionDiscountAmount: 5000 }), "할인액 있으면 포인트 불가");
assert(couponBlocksPoints({ promotionCodeId: "CSA53BA4" }), "코드만 있어도 포인트 불가");

assert(!promotionCodesAllowedOnOrderSource("web"), "웹은 쿠폰 적용 불가");
assert(!promotionCodesAllowedOnOrderSource("WEB"), "웹 대소문자");
assert(promotionCodesAllowedOnOrderSource("app"), "앱은 쿠폰 적용");
assert(promotionCodesAllowedOnOrderSource("ios"), "ios는 앱");
assert(promotionCodesAllowedOnOrderSource("android"), "android는 앱");

assert(
  classifyWalletCoupon({ isActive: true, now, usedCount: 0, maxUses: 1 }) === "usable",
  "사용가능"
);
assert(
  classifyWalletCoupon({
    isActive: true,
    now,
    validUntil: new Date("2026-08-01T00:00:00.000Z"),
    usedCount: 0,
  }) === "expired",
  "만료"
);
assert(
  classifyWalletCoupon({ isActive: true, now, usedCount: 1, maxUses: 1 }) === "used",
  "사용완료"
);
assert(
  classifyWalletCoupon({ isActive: false, now, usedCount: 0 }) === "inactive",
  "비활성"
);

console.log("promotion-eval.test.ts ok");
