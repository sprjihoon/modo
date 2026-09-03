/// 앱 프로모션 코드 적용 규칙. UI/Supabase 없이 검증·테스트한다.
class PromotionEvalInput {
  const PromotionEvalInput({
    required this.now,
    required this.orderAmount,
    required this.isActive,
    required this.validFrom,
    this.validUntil,
    this.minOrderAmount = 0,
    this.maxUses,
    this.usedCount = 0,
    this.maxUsesPerUser = 1,
    this.userUsageCount = 0,
    required this.discountType,
    required this.discountValue,
    this.maxDiscountAmount,
    this.assignedUserId,
    this.currentUserId,
  });

  final DateTime now;
  final int orderAmount;
  final bool isActive;
  final DateTime validFrom;
  final DateTime? validUntil;
  final int minOrderAmount;
  final int? maxUses;
  final int usedCount;
  final int maxUsesPerUser;
  final int userUsageCount;
  final String discountType;
  final int discountValue;
  final int? maxDiscountAmount;
  final String? assignedUserId;
  final String? currentUserId;
}

class PromotionEvalResult {
  const PromotionEvalResult({this.error, this.discountAmount = 0});

  final String? error;
  final int discountAmount;

  bool get ok => error == null;
}

int calculatePromotionDiscount({
  required int orderAmount,
  required String discountType,
  required int discountValue,
  int? maxDiscountAmount,
}) {
  var discountAmount = discountType == 'PERCENTAGE'
      ? (orderAmount * discountValue / 100).round()
      : discountValue;

  if (maxDiscountAmount != null && discountAmount > maxDiscountAmount) {
    discountAmount = maxDiscountAmount;
  }
  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }
  if (discountAmount < 0) {
    discountAmount = 0;
  }
  return discountAmount;
}

String formatPromotionPrice(int price) {
  return price.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (Match m) => '${m[1]},',
      );
}

enum CouponWalletStatus { usable, used, expired, inactive }

/// 쿠폰이 있으면 포인트와 함께 쓸 수 없다.
bool couponBlocksPoints({
  int promotionDiscountAmount = 0,
  String? promotionCodeId,
}) {
  return promotionDiscountAmount > 0 ||
      (promotionCodeId != null && promotionCodeId.isNotEmpty);
}

/// 웹 주문은 쿠폰·프로모 적용 불가. 앱(ios/android 포함)만 적용.
bool promotionCodesAllowedOnOrderSource(String? source) {
  return (source ?? '').toLowerCase().trim() != 'web';
}

String couponWalletOptionLabel({
  required String code,
  required String discountType,
  required int discountValue,
  bool includesFreeShipping = false,
}) {
  final discount = discountType == 'PERCENTAGE'
      ? '$discountValue% 할인'
      : '${formatPromotionPrice(discountValue)}원 할인';
  final shipping = includesFreeShipping ? ' · 배송비 무료' : '';
  if (code.isEmpty) return '$discount$shipping';
  return '$code · $discount$shipping';
}

/// 쿠폰 플래그 ON이면 왕복 기본 배송비 전액. 배송 프로모와는 더 큰 쪽만.
({int shippingDiscountAmount, bool couponWaivesShipping}) resolveShippingDiscount({
  required int shippingPromoDiscount,
  required bool couponFreeShipping,
  required int baseShippingFee,
}) {
  final base = baseShippingFee < 0 ? 0 : baseShippingFee;
  final promoRaw = shippingPromoDiscount < 0 ? 0 : shippingPromoDiscount;
  final promoAmt = promoRaw > base ? base : promoRaw;
  final couponAmt = couponFreeShipping ? base : 0;
  return (
    shippingDiscountAmount: promoAmt > couponAmt ? promoAmt : couponAmt,
    couponWaivesShipping: couponAmt > promoAmt,
  );
}

List<Map<String, dynamic>> usableWalletCoupons(
  List<Map<String, dynamic>> rows, {
  required DateTime now,
}) {
  return rows.where((row) {
    return classifyWalletCoupon(
          isActive: row['is_active'] as bool? ?? true,
          now: now,
          validUntil: row['valid_until'] != null
              ? DateTime.parse(row['valid_until'] as String)
              : null,
          usedCount: row['used_count'] as int? ?? 0,
          maxUses: row['max_uses'] as int? ?? 1,
        ) ==
        CouponWalletStatus.usable;
  }).toList();
}

CouponWalletStatus classifyWalletCoupon({
  required bool isActive,
  required DateTime now,
  DateTime? validUntil,
  required int usedCount,
  int maxUses = 1,
}) {
  if (!isActive) return CouponWalletStatus.inactive;
  if (validUntil != null && now.isAfter(validUntil)) {
    return CouponWalletStatus.expired;
  }
  if (usedCount >= maxUses) return CouponWalletStatus.used;
  return CouponWalletStatus.usable;
}

PromotionEvalResult evaluatePromotionCode(PromotionEvalInput input) {
  if (input.assignedUserId != null &&
      input.assignedUserId != input.currentUserId) {
    return const PromotionEvalResult(error: '이 코드는 사용할 수 없습니다.');
  }
  if (!input.isActive) {
    return const PromotionEvalResult(error: '유효하지 않은 프로모션 코드입니다.');
  }
  if (input.now.isBefore(input.validFrom)) {
    return const PromotionEvalResult(error: '아직 사용할 수 없는 프로모션 코드입니다.');
  }
  if (input.validUntil != null && input.now.isAfter(input.validUntil!)) {
    return const PromotionEvalResult(error: '만료된 프로모션 코드입니다.');
  }
  if (input.orderAmount < input.minOrderAmount) {
    return PromotionEvalResult(
      error:
          '최소 주문 금액 ${formatPromotionPrice(input.minOrderAmount)}원 이상부터 사용 가능합니다.',
    );
  }
  if (input.maxUses != null && input.usedCount >= input.maxUses!) {
    return const PromotionEvalResult(error: '프로모션 코드 사용 가능 횟수가 초과되었습니다.');
  }
  if (input.userUsageCount >= input.maxUsesPerUser) {
    return const PromotionEvalResult(error: '이미 사용한 프로모션 코드입니다.');
  }

  return PromotionEvalResult(
    discountAmount: calculatePromotionDiscount(
      orderAmount: input.orderAmount,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscountAmount: input.maxDiscountAmount,
    ),
  );
}
