import 'package:supabase_flutter/supabase_flutter.dart';

import 'promotion_rules.dart';

/// 프로모션 코드 서비스
class PromotionService {
  final _supabase = Supabase.instance.client;

  /// 프로모션 코드 검증 및 정보 조회
  Future<Map<String, dynamic>> validatePromotionCode(
    String code, {
    required int orderAmount,
  }) async {
    try {
      final response = await _supabase
          .from('promotion_codes')
          .select()
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

      if (response == null) {
        throw Exception('유효하지 않은 프로모션 코드입니다.');
      }

      final promoCode = response;
      final promoId = promoCode['id'] as String;
      final publicUserId = await _publicUserId();
      final authUserId = _supabase.auth.currentUser?.id;
      final userUsageCount = await _getUserUsageCount(
        promoId,
        publicUserId: publicUserId,
        authUserId: authUserId,
      );

      final result = evaluatePromotionCode(
        PromotionEvalInput(
          now: DateTime.now(),
          orderAmount: orderAmount,
          isActive: promoCode['is_active'] as bool? ?? true,
          validFrom: DateTime.parse(promoCode['valid_from'] as String),
          validUntil: promoCode['valid_until'] != null
              ? DateTime.parse(promoCode['valid_until'] as String)
              : null,
          minOrderAmount: promoCode['min_order_amount'] as int? ?? 0,
          maxUses: promoCode['max_uses'] as int?,
          usedCount: promoCode['used_count'] as int? ?? 0,
          maxUsesPerUser: promoCode['max_uses_per_user'] as int? ?? 1,
          userUsageCount: userUsageCount,
          discountType: promoCode['discount_type'] as String,
          discountValue: promoCode['discount_value'] as int,
          maxDiscountAmount: promoCode['max_discount_amount'] as int?,
          assignedUserId: promoCode['assigned_user_id'] as String?,
          currentUserId: publicUserId,
        ),
      );
      if (!result.ok) {
        throw Exception(result.error);
      }

      return {
        'id': promoCode['id'],
        'code': promoCode['code'],
        'description': promoCode['description'],
        'discount_type': promoCode['discount_type'],
        'discount_value': promoCode['discount_value'],
        'discount_amount': result.discountAmount,
        'original_amount': orderAmount,
        'final_amount': orderAmount - result.discountAmount,
      };
    } catch (e) {
      rethrow;
    }
  }

  Future<String?> _publicUserId() async {
    final authId = _supabase.auth.currentUser?.id;
    if (authId == null) return null;
    try {
      final row = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', authId)
          .maybeSingle();
      return row?['id'] as String?;
    } catch (_) {
      return null;
    }
  }

  /// 이력 + 본인 결제 주문 중 큰 값. user_id 는 public.users.id 가 정본이다.
  Future<int> _getUserUsageCount(
    String promotionCodeId, {
    String? publicUserId,
    String? authUserId,
  }) async {
    var fromUsages = 0;
    var fromOrders = 0;
    try {
      if (publicUserId != null) {
        final byPublic = await _supabase
            .from('promotion_code_usages')
            .select('id')
            .eq('promotion_code_id', promotionCodeId)
            .eq('user_id', publicUserId);
        fromUsages = (byPublic as List).length;
      }
      if (fromUsages == 0 && authUserId != null) {
        final byAuth = await _supabase
            .from('promotion_code_usages')
            .select('id')
            .eq('promotion_code_id', promotionCodeId)
            .eq('user_id', authUserId);
        fromUsages = (byAuth as List).length;
      }
    } catch (_) {}

    try {
      if (publicUserId != null) {
        final orders = await _supabase
            .from('orders')
            .select('id, payment_status, paid_at')
            .eq('promotion_code_id', promotionCodeId)
            .eq('user_id', publicUserId);
        fromOrders = (orders as List).where((row) {
          final payment =
              (row['payment_status'] as String? ?? '').toUpperCase();
          if (const ['FAILED', 'CANCELED', 'REFUNDED', 'PENDING']
              .contains(payment)) {
            return false;
          }
          return row['paid_at'] != null ||
              const ['PAID', 'PARTIAL_CANCELED', 'COMPLETED', 'DONE']
                  .contains(payment);
        }).length;
      }
    } catch (_) {}

    return fromUsages > fromOrders ? fromUsages : fromOrders;
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
      final userId = await _publicUserId() ?? _supabase.auth.currentUser?.id;
      if (userId == null) {
        throw Exception('로그인이 필요합니다.');
      }

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
      },);
    } catch (e) {
      rethrow;
    }
  }

  /// 나한테 발급된 전용 쿠폰
  Future<List<Map<String, dynamic>>> getMyCoupons() async {
    final publicUserId = await _publicUserId();
    if (publicUserId == null) return [];
    try {
      final response = await _supabase
          .from('promotion_codes')
          .select()
          .eq('assigned_user_id', publicUserId)
          .order('created_at', ascending: false);
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      return [];
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

      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      return [];
    }
  }

}

