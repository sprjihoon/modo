import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 배너 서비스
class BannerService {
  final _supabase = Supabase.instance.client;

  /// 활성화된 배너 목록 조회
  Future<List<Map<String, dynamic>>> getActiveBanners() async {
    try {
      final response = await _supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);

      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      debugPrint('배너 조회 실패: $e');
      // 오류 발생 시 빈 리스트 반환 (기본 배너 표시)
      return [];
    }
  }

  /// 모든 배너 목록 조회 (관리자용)
  Future<List<Map<String, dynamic>>> getAllBanners() async {
    try {
      final response = await _supabase
          .from('banners')
          .select('*')
          .order('display_order', ascending: true);

      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      debugPrint('배너 조회 실패: $e');
      return [];
    }
  }
}

