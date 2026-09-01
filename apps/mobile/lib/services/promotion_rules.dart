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
