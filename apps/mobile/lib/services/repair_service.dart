import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logger/logger.dart';

/// 수선 메뉴 서비스
class RepairService {
  final _supabase = Supabase.instance.client;
  final _logger = Logger();

  /// 수선 카테고리 목록 조회 (활성 항목만)
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final response = await _supabase
          .from('repair_categories')
          .select()
          .eq('is_active', true)
          .order('display_order', ascending: true); // 오름차순 정렬

      _logger.i('✅ 수선 카테고리 조회 성공: ${response.length}개');
      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      _logger.e('❌ 수선 카테고리 조회 실패: $e');
      rethrow;
    }
  }

  /// 특정 카테고리의 수선 종류 조회
  Future<List<Map<String, dynamic>>> getRepairTypesByCategory(String categoryId) async {
    try {
      final response = await _supabase
          .from('repair_types')
          .select()
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('display_order', ascending: true); // 오름차순

      _logger.i('✅ 수선 종류 조회 성공: ${response.length}개');
      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      _logger.e('❌ 수선 종류 조회 실패: $e');
      rethrow;
    }
  }

  /// 모든 수선 종류 조회 (카테고리 포함)
  Future<List<Map<String, dynamic>>> getAllRepairTypesWithCategories() async {
    try {
      final response = await _supabase
          .from('repair_types')
          .select('''
            *,
            category:repair_categories(*)
          ''')
          .eq('is_active', true)
          .order('display_order');

      _logger.i('✅ 전체 수선 종류 조회 성공: ${response.length}개');
      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      _logger.e('❌ 전체 수선 종류 조회 실패: $e');
      rethrow;
    }
  }

  /// 수선 종류 검색
  Future<List<Map<String, dynamic>>> searchRepairTypes(String query) async {
    try {
      final response = await _supabase
          .from('repair_types')
          .select('''
            *,
            category:repair_categories(name)
          ''')
          .eq('is_active', true)
          .or('name.ilike.%$query%,sub_type.ilike.%$query%,description.ilike.%$query%')
          .order('display_order')
          .limit(20);

      _logger.i('✅ 수선 종류 검색 성공: ${response.length}개');
      // Supabase 응답을 올바르게 캐스팅
      return (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
    } catch (e) {
      _logger.e('❌ 수선 종류 검색 실패: $e');
      rethrow;
    }
  }
}


