import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 주문 제한 상태 모델
class OrderLimitStatus {
  final bool isLimited;
  final int? dailyLimit;
  final int todayCount;
  final int? remaining;
  final String? title;
  final String? message;

  OrderLimitStatus({
    required this.isLimited,
    this.dailyLimit,
    required this.todayCount,
    this.remaining,
    this.title,
    this.message,
  });

  factory OrderLimitStatus.fromJson(Map<String, dynamic> json) {
    return OrderLimitStatus(
      isLimited: json['is_limited'] ?? false,
      dailyLimit: json['daily_limit'],
      todayCount: json['today_count'] ?? 0,
      remaining: json['remaining'],
      title: json['title'],
      message: json['message'],
    );
  }

  /// 제한이 없는 기본 상태
  factory OrderLimitStatus.unlimited() {
    return OrderLimitStatus(
      isLimited: false,
      dailyLimit: null,
      todayCount: 0,
      remaining: null,
      title: null,
      message: null,
    );
  }
}

/// 대기자 등록 결과
class WaitlistResult {
  final bool success;
  final String? waitlistId;
  final String message;

  WaitlistResult({
    required this.success,
    this.waitlistId,
    required this.message,
  });

  factory WaitlistResult.fromJson(Map<String, dynamic> json) {
    return WaitlistResult(
      success: json['success'] ?? false,
      waitlistId: json['waitlist_id'],
      message: json['message'] ?? '',
    );
  }
}

/// 주문 제한 서비스
/// 
/// 일일 주문 제한량을 체크하고 대기자 등록을 처리합니다.
class OrderLimitService {
  static final OrderLimitService _instance = OrderLimitService._internal();
  factory OrderLimitService() => _instance;
  OrderLimitService._internal();

  final _supabase = Supabase.instance.client;

  /// 주문 제한 상태 확인
  Future<OrderLimitStatus> checkOrderLimitStatus() async {
    try {
      debugPrint('📊 주문 제한 상태 확인 중...');
      
      final response = await _supabase
          .rpc('check_order_limit_status');
      
      if (response == null) {
        debugPrint('⚠️ 제한 상태 없음 - 무제한');
        return OrderLimitStatus.unlimited();
      }

      final status = OrderLimitStatus.fromJson(response);
      debugPrint('📊 주문 제한 상태: isLimited=${status.isLimited}, today=${status.todayCount}, limit=${status.dailyLimit}');
      
      return status;
    } catch (e) {
      debugPrint('❌ 주문 제한 상태 확인 실패: $e');
      // 에러 발생 시 기본적으로 무제한으로 처리 (사용자 경험 우선)
      return OrderLimitStatus.unlimited();
    }
  }

  /// 대기자 등록 (알림 받기)
  Future<WaitlistResult> registerWaitlist() async {
    try {
      debugPrint('📝 대기자 등록 중...');
      
      // 현재 사용자 정보 가져오기
      final user = _supabase.auth.currentUser;
      if (user == null) {
        return WaitlistResult(
          success: false,
          message: '로그인이 필요합니다',
        );
      }

      // public.users에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id, fcm_token')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        return WaitlistResult(
          success: false,
          message: '사용자 정보를 찾을 수 없습니다',
        );
      }

      final userId = userResponse['id'] as String;
      final fcmToken = userResponse['fcm_token'] as String?;

      // 대기자 등록 RPC 호출
      final response = await _supabase.rpc(
        'register_order_waitlist',
        params: {
          'p_user_id': userId,
          'p_fcm_token': fcmToken,
        },
      );

      if (response == null) {
        return WaitlistResult(
          success: false,
          message: '알림 신청에 실패했습니다',
        );
      }

      final result = WaitlistResult.fromJson(response);
      debugPrint('✅ 대기자 등록 결과: ${result.message}');
      
      return result;
    } catch (e) {
      debugPrint('❌ 대기자 등록 실패: $e');
      return WaitlistResult(
        success: false,
        message: '알림 신청 중 오류가 발생했습니다',
      );
    }
  }

  /// 현재 사용자가 이미 대기자로 등록되어 있는지 확인
  Future<bool> isAlreadyWaiting() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return false;

      // public.users에서 user_id 조회
      final userResponse = await _supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

      if (userResponse == null) return false;

      final userId = userResponse['id'] as String;
      final today = DateTime.now().toIso8601String().split('T')[0];

      final response = await _supabase
          .from('order_waitlist')
          .select('id')
          .eq('user_id', userId)
          .eq('request_date', today)
          .eq('status', 'waiting')
          .maybeSingle();

      return response != null;
    } catch (e) {
      debugPrint('❌ 대기 상태 확인 실패: $e');
      return false;
    }
  }
}

