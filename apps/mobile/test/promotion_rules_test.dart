import 'package:flutter_test/flutter_test.dart';
import 'package:modu_repair/services/promotion_rules.dart';

void main() {
  final now = DateTime.parse('2026-09-01T12:00:00.000Z');

  PromotionEvalInput base({
    bool isActive = true,
    DateTime? validFrom,
    DateTime? validUntil,
    int orderAmount = 30000,
    int minOrderAmount = 0,
    int? maxUses,
    int usedCount = 0,
    int maxUsesPerUser = 1,
    int userUsageCount = 0,
    String discountType = 'PERCENTAGE',
    int discountValue = 10,
    int? maxDiscountAmount,
    String? assignedUserId,
    String? currentUserId,
  }) {
    return PromotionEvalInput(
      now: now,
      orderAmount: orderAmount,
      isActive: isActive,
      validFrom: validFrom ?? DateTime.parse('2026-08-01T00:00:00.000Z'),
      validUntil: validUntil,
      minOrderAmount: minOrderAmount,
      maxUses: maxUses,
      usedCount: usedCount,
      maxUsesPerUser: maxUsesPerUser,
      userUsageCount: userUsageCount,
      discountType: discountType,
      discountValue: discountValue,
      maxDiscountAmount: maxDiscountAmount,
      assignedUserId: assignedUserId,
      currentUserId: currentUserId,
    );
  }

  test('비활성 코드는 거절', () {
    final r = evaluatePromotionCode(base(isActive: false));
    expect(r.ok, isFalse);
    expect(r.error, contains('유효하지 않은'));
  });

  test('시작 전 코드는 거절', () {
    final r = evaluatePromotionCode(
      base(validFrom: DateTime.parse('2026-10-01T00:00:00.000Z')),
    );
    expect(r.error, contains('아직 사용할 수 없는'));
  });

  test('만료 코드는 거절', () {
    final r = evaluatePromotionCode(
      base(validUntil: DateTime.parse('2026-08-31T00:00:00.000Z')),
    );
    expect(r.error, contains('만료'));
  });

  test('최소 주문 금액 미달 거절', () {
    final r = evaluatePromotionCode(
      base(orderAmount: 9000, minOrderAmount: 10000),
    );
    expect(r.error, contains('최소 주문 금액'));
    expect(r.error, contains('10,000'));
  });

  test('전체 선착순 10회면 10번째까지 허용', () {
    final ok = evaluatePromotionCode(base(maxUses: 10, usedCount: 9));
    expect(ok.ok, isTrue);
    expect(ok.discountAmount, 3000);

    final full = evaluatePromotionCode(base(maxUses: 10, usedCount: 10));
    expect(full.ok, isFalse);
    expect(full.error, contains('사용 가능 횟수가 초과'));
  });

  test('사용자당 1회면 이미 쓴 사람은 거절', () {
    final first = evaluatePromotionCode(
      base(maxUses: 10, usedCount: 3, maxUsesPerUser: 1, userUsageCount: 0),
    );
    expect(first.ok, isTrue);

    final again = evaluatePromotionCode(
      base(maxUses: 10, usedCount: 3, maxUsesPerUser: 1, userUsageCount: 1),
    );
    expect(again.ok, isFalse);
    expect(again.error, contains('이미 사용한'));
  });

  test('사용자당 2회면 두 번째까지 허용', () {
    expect(
      evaluatePromotionCode(
        base(maxUsesPerUser: 2, userUsageCount: 1),
      ).ok,
      isTrue,
    );
    expect(
      evaluatePromotionCode(
        base(maxUsesPerUser: 2, userUsageCount: 2),
      ).ok,
      isFalse,
    );
  });

  test('전체 한도가 사용자 한도보다 먼저 막힌다', () {
    final r = evaluatePromotionCode(
      base(maxUses: 10, usedCount: 10, maxUsesPerUser: 2, userUsageCount: 0),
    );
    expect(r.error, contains('사용 가능 횟수가 초과'));
  });

  test('퍼센트 할인', () {
    expect(
      calculatePromotionDiscount(
        orderAmount: 30000,
        discountType: 'PERCENTAGE',
        discountValue: 10,
      ),
      3000,
    );
  });

  test('퍼센트 할인은 최대 할인 금액을 넘지 않는다', () {
    expect(
      calculatePromotionDiscount(
        orderAmount: 100000,
        discountType: 'PERCENTAGE',
        discountValue: 50,
        maxDiscountAmount: 10000,
      ),
      10000,
    );
  });

  test('고정 할인', () {
    expect(
      calculatePromotionDiscount(
        orderAmount: 30000,
        discountType: 'FIXED',
        discountValue: 5000,
      ),
      5000,
    );
  });

  test('100% 할인은 수선비 0원', () {
    final r = evaluatePromotionCode(
      base(discountType: 'PERCENTAGE', discountValue: 100),
    );
    expect(r.ok, isTrue);
    expect(r.discountAmount, 30000);
  });

  test('고정 할인이 주문 금액보다 크면 주문 금액까지만', () {
    expect(
      calculatePromotionDiscount(
        orderAmount: 3000,
        discountType: 'FIXED',
        discountValue: 5000,
      ),
      3000,
    );
  });

  test('전용 코드는 본인만 통과', () {
    final mine = evaluatePromotionCode(
      base(assignedUserId: 'user-1', currentUserId: 'user-1'),
    );
    expect(mine.ok, isTrue);

    final other = evaluatePromotionCode(
      base(assignedUserId: 'user-1', currentUserId: 'user-2'),
    );
    expect(other.ok, isFalse);
    expect(other.error, contains('사용할 수 없습니다'));

    final guest = evaluatePromotionCode(
      base(assignedUserId: 'user-1', currentUserId: null),
    );
    expect(guest.ok, isFalse);
  });

  test('쿠폰과 포인트는 함께 쓸 수 없다', () {
    expect(couponBlocksPoints(), isFalse);
    expect(couponBlocksPoints(promotionDiscountAmount: 5000), isTrue);
    expect(couponBlocksPoints(promotionCodeId: 'CSA53BA4'), isTrue);
    expect(couponBlocksPoints(promotionCodeId: ''), isFalse);
  });

  test('웹에서는 쿠폰을 적용하지 않는다', () {
    expect(promotionCodesAllowedOnOrderSource('web'), isFalse);
    expect(promotionCodesAllowedOnOrderSource('WEB'), isFalse);
    expect(promotionCodesAllowedOnOrderSource('app'), isTrue);
    expect(promotionCodesAllowedOnOrderSource('ios'), isTrue);
    expect(promotionCodesAllowedOnOrderSource('android'), isTrue);
  });

  test('쿠폰함 상태 분류', () {
    expect(
      classifyWalletCoupon(
        isActive: true,
        now: now,
        usedCount: 0,
      ),
      CouponWalletStatus.usable,
    );
    expect(
      classifyWalletCoupon(
        isActive: true,
        now: now,
        usedCount: 1,
      ),
      CouponWalletStatus.used,
    );
    expect(
      classifyWalletCoupon(
        isActive: true,
        now: now,
        validUntil: DateTime.parse('2026-08-01T00:00:00.000Z'),
        usedCount: 0,
      ),
      CouponWalletStatus.expired,
    );
  });

  test('쿠폰 셀렉트 라벨은 코드와 할인액을 붙인다', () {
    expect(
      couponWalletOptionLabel(
        code: 'WELCOME',
        discountType: 'FIXED',
        discountValue: 5000,
      ),
      'WELCOME · 5,000원 할인',
    );
    expect(
      couponWalletOptionLabel(
        code: 'SALE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      ),
      'SALE10 · 10% 할인',
    );
  });

  test('사용 가능한 지갑 쿠폰만 셀렉트에 남긴다', () {
    final rows = [
      {
        'code': 'OK',
        'is_active': true,
        'used_count': 0,
        'max_uses': 1,
      },
      {
        'code': 'USED',
        'is_active': true,
        'used_count': 1,
        'max_uses': 1,
      },
      {
        'code': 'OFF',
        'is_active': false,
        'used_count': 0,
        'max_uses': 1,
      },
    ];
    final usable = usableWalletCoupons(rows, now: now);
    expect(usable.map((e) => e['code']), ['OK']);
  });

  test('전체 무제한 + 1인 1회는 선착순 제한 없이 1인 1번', () {
    final r = evaluatePromotionCode(
      base(maxUses: null, usedCount: 99, maxUsesPerUser: 1, userUsageCount: 0),
    );
    expect(r.ok, isTrue);
  });
}
