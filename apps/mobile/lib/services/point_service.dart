import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 결제 시 포인트 사용 최저 금액
const int kMinPointsUse = 1000;

/// 포인트 서비스
class PointService {
  final _supabase = Supabase.instance.client;

  Future<String?> _currentUserId() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;
    final row = await _supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
    return row?['id'] as String?;
  }

  /// 현재 포인트 잔액 조회
  Future<int> getPointBalance() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // auth_id로 users 테이블 조회
      final response = await _supabase
          .from('users')
          .select('point_balance')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (response == null) {
        return 0;
      }

      return response['point_balance'] as int? ?? 0;
    } catch (e) {
      debugPrint('포인트 잔액 조회 실패: $e');
      throw Exception('포인트 정보를 불러오는데 실패했습니다');
    }
  }

  /// 결제 인텐트에 포인트 적용/해제 (0이면 해제, 사용 시 최저 [kMinPointsUse])
  Future<Map<String, dynamic>> applyPointsToPaymentIntent({
    required String intentId,
    required int pointsToUse,
  }) async {
    final userId = await _currentUserId();
    if (userId == null) {
      throw Exception('로그인이 필요합니다');
    }

    final response = await _supabase.rpc(
      'apply_points_to_payment_intent',
      params: {
        'p_intent_id': intentId,
        'p_user_id': userId,
        'p_points': pointsToUse,
      },
    );

    if (response is! Map) {
      throw Exception('포인트 적용에 실패했습니다');
    }
    return Map<String, dynamic>.from(response);
  }

  String mapApplyPointsError(Object e) {
    final msg = e.toString();
    if (msg.contains('MIN_POINTS')) {
      return '포인트는 ${kMinPointsUse.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}P 이상부터 사용할 수 있습니다.';
    }
    if (msg.contains('BALANCE_TOO_LOW')) {
      return '포인트가 ${kMinPointsUse}P 이상일 때만 사용할 수 있습니다.';
    }
    if (msg.contains('INSUFFICIENT_POINTS')) {
      return '보유 포인트가 부족합니다.';
    }
    if (msg.contains('EXCEEDS_TOTAL')) {
      return '결제 금액을 초과해 포인트를 사용할 수 없습니다.';
    }
    if (msg.contains('INTENT_EXPIRED')) {
      return '결제 시간이 만료되었습니다. 주문을 다시 시작해주세요.';
    }
    if (msg.contains('INTENT_CONSUMED')) {
      return '이미 처리된 결제입니다.';
    }
    if (msg.contains('FORBIDDEN')) {
      return '권한이 없습니다.';
    }
    if (msg.contains('INTENT_NOT_FOUND')) {
      return '결제 정보를 찾을 수 없습니다.';
    }
    return '포인트 적용에 실패했습니다.';
  }

  /// 포인트 전액 결제 (total_price == 0)
  Future<String> completePaymentWithPoints(String intentId) async {
    final response = await _supabase.functions.invoke(
      'payments-complete-with-points',
      body: {'intentId': intentId},
    );
    final data = response.data;
    if (data is! Map) {
      throw Exception('포인트 결제 처리에 실패했습니다');
    }
    final map = Map<String, dynamic>.from(data);
    if (map['error'] != null) {
      throw Exception(map['error'].toString());
    }
    final orderId = map['orderId'] as String?;
    if (orderId == null || orderId.isEmpty) {
      throw Exception('주문 생성에 실패했습니다');
    }
    return orderId;
  }

  /// 포인트 내역 조회
  Future<List<Map<String, dynamic>>> getPointHistory({int limit = 20, int offset = 0}) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('로그인이 필요합니다');
      }

      // 1. users 테이블에서 id(UUID) 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
      
      if (userResponse == null) {
        return [];
      }

      final userId = userResponse['id'] as String;

      // 2. point_transactions 조회
      final response = await _supabase
          .from('point_transactions')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .range(offset, offset + limit - 1);

      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      debugPrint('포인트 내역 조회 실패: $e');
      throw Exception('포인트 내역을 불러오는데 실패했습니다');
    }
  }
}

