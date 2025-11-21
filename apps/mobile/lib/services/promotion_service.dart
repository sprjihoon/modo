import 'package:supabase_flutter/supabase_flutter.dart';

/// 프로모션 코드 서비스
class PromotionService {
  final _supabase = Supabase.instance.client;

  /// 프로모션 코드 검증 및 정보 조회
  Future<Map<String, dynamic>> validatePromotionCode(
    String code, {
    required int orderAmount,
  }) async {
    try {
      // 1. 프로모션 코드 조회
      final response = await _supabase
          .from('promotion_codes')
          .select()
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

      if (response == null) {
        throw Exception('유효하지 않은 프로모션 코드입니다.');
      }

      final promoCode = response as Map<String, dynamic>;

      // 2. 유효기간 확인
      final now = DateTime.now();
      final validFrom = DateTime.parse(promoCode['valid_from'] as String);
      final validUntil = promoCode['valid_until'] != null
          ? DateTime.parse(promoCode['valid_until'] as String)
          : null;

      if (now.isBefore(validFrom)) {
        throw Exception('아직 사용할 수 없는 프로모션 코드입니다.');
      }

      if (validUntil != null && now.isAfter(validUntil)) {
        throw Exception('만료된 프로모션 코드입니다.');
      }

      // 3. 최소 주문 금액 확인
      final minOrderAmount = promoCode['min_order_amount'] as int? ?? 0;
      if (orderAmount < minOrderAmount) {
        throw Exception('최소 주문 금액 ${_formatPrice(minOrderAmount)}원 이상부터 사용 가능합니다.');
      }

      // 4. 최대 사용 횟수 확인
      final maxUses = promoCode['max_uses'] as int?;
      final usedCount = promoCode['used_count'] as int? ?? 0;

      if (maxUses != null && usedCount >= maxUses) {
        throw Exception('프로모션 코드 사용 가능 횟수가 초과되었습니다.');
      }

      // 5. 사용자별 최대 사용 횟수 확인
      final userId = _supabase.auth.currentUser?.id;
      if (userId != null) {
        final maxUsesPerUser = promoCode['max_uses_per_user'] as int? ?? 1;
        final userUsageCount = await _getUserUsageCount(
          promoCode['id'] as String,
          userId,
        );

        if (userUsageCount >= maxUsesPerUser) {
          throw Exception('이미 사용한 프로모션 코드입니다.');
        }
      }

      // 6. 할인 금액 계산
      final discountAmount = _calculateDiscount(
        orderAmount: orderAmount,
        discountType: promoCode['discount_type'] as String,
        discountValue: promoCode['discount_value'] as int,
        maxDiscountAmount: promoCode['max_discount_amount'] as int?,
      );

      return {
        'id': promoCode['id'],
        'code': promoCode['code'],
        'description': promoCode['description'],
        'discount_type': promoCode['discount_type'],
        'discount_value': promoCode['discount_value'],
        'discount_amount': discountAmount,
        'original_amount': orderAmount,
        'final_amount': orderAmount - discountAmount,
      };
    } catch (e) {
      rethrow;
    }
  }

  /// 할인 금액 계산
  int _calculateDiscount({
    required int orderAmount,
    required String discountType,
    required int discountValue,
    int? maxDiscountAmount,
  }) {
    int discountAmount;

    if (discountType == 'PERCENTAGE') {
      // 퍼센트 할인
      discountAmount = (orderAmount * discountValue / 100).round();
    } else {
      // 고정 금액 할인
      discountAmount = discountValue;
    }

    // 최대 할인 금액 제한
    if (maxDiscountAmount != null && discountAmount > maxDiscountAmount) {
      discountAmount = maxDiscountAmount;
    }

    // 주문 금액보다 할인 금액이 클 수 없음
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return discountAmount;
  }

  /// 사용자의 프로모션 코드 사용 횟수 조회
  Future<int> _getUserUsageCount(String promotionCodeId, String userId) async {
    try {
      final response = await _supabase
          .from('promotion_code_usages')
          .select('id')
          .eq('promotion_code_id', promotionCodeId)
          .eq('user_id', userId);

      return (response as List).length;
    } catch (e) {
      return 0;
    }
  }

  /// 프로모션 코드 사용 기록
  Future<void> recordPromotionCodeUsage({
    required String promotionCodeId,
    required String orderId,
    required int discountAmount,
    required int originalAmount,
    required int finalAmount,
  }) async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('로그인이 필요합니다.');
      }

      // 1. 사용 기록 저장
      await _supabase.from('promotion_code_usages').insert({
        'promotion_code_id': promotionCodeId,
        'user_id': userId,
        'order_id': orderId,
        'discount_amount': discountAmount,
        'original_amount': originalAmount,
        'final_amount': finalAmount,
      });

      // 2. 프로모션 코드 사용 횟수 증가
      await _supabase.rpc('increment_promotion_code_usage', params: {
        'promo_id': promotionCodeId,
      });
    } catch (e) {
      rethrow;
    }
  }

  /// 활성 프로모션 코드 목록 조회
  Future<List<Map<String, dynamic>>> getActivePromotionCodes() async {
    try {
      final response = await _supabase
          .from('promotion_codes')
          .select()
          .eq('is_active', true)
          .gte('valid_until', DateTime.now().toIso8601String())
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      return [];
    }
  }

  /// 가격 포맷팅
  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (Match m) => '${m[1]},',
        );
  }
}

