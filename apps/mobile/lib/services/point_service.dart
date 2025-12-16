import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 포인트 서비스
class PointService {
  final _supabase = Supabase.instance.client;

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

