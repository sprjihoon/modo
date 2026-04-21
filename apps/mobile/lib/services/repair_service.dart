import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logger/logger.dart';

/// 가격표 항목 (수선 종류)
class RepairTypeItem {
  final String id;
  final String name;
  final String? description;
  final num? price;
  final String? categoryId;

  const RepairTypeItem({
    required this.id,
    required this.name,
    this.description,
    this.price,
    this.categoryId,
  });

  factory RepairTypeItem.fromMap(Map<String, dynamic> m) {
    return RepairTypeItem(
      id: m['id'].toString(),
      name: (m['name'] as String?) ?? '',
      description: m['description'] as String?,
      price: m['price'] as num?,
      categoryId: m['category_id']?.toString(),
    );
  }
}

/// 소카테고리 (또는 flat 구조에서의 단일 카테고리)
class RepairSubCategory {
  final String id;
  final String name;
  final num displayOrder;
  final List<RepairTypeItem> repairTypes;

  const RepairSubCategory({
    required this.id,
    required this.name,
    required this.displayOrder,
    required this.repairTypes,
  });
}

/// 대카테고리
class RepairMainCategory {
  final String id;
  final String name;
  final num displayOrder;
  final List<RepairSubCategory> subCategories;
  final List<RepairTypeItem> repairTypes; // 대카테고리 직속 항목

  const RepairMainCategory({
    required this.id,
    required this.name,
    required this.displayOrder,
    required this.subCategories,
    required this.repairTypes,
  });
}

/// 가격 안내 화면용 카테고리/항목 통합 결과
/// 웹 `/api/repair-categories` 응답과 동일한 구조
class RepairCategoriesResult {
  final bool hierarchical;
  final List<RepairMainCategory> mainCategories;
  final List<RepairSubCategory> flatCategories; // 비계층 또는 orphan subs
  final List<RepairTypeItem> uncategorized;

  const RepairCategoriesResult({
    required this.hierarchical,
    required this.mainCategories,
    required this.flatCategories,
    required this.uncategorized,
  });
}

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

  /// 가격 안내용: 카테고리 계층 구조 + 모든 수선 항목을 한 번에 조회
  /// 웹의 `/api/repair-categories` API와 동일한 결과를 만들어냅니다.
  ///
  /// - 계층 구조 (parent_category_id 컬럼 존재 + 대카테고리 1개 이상): hierarchical=true
  ///   * mainCategories에 대카테고리 + 그 아래 subCategories + 직속 항목
  ///   * flatCategories에는 어느 대카테고리에도 속하지 않은 orphan 소카테고리
  /// - flat 구조 (parent_category_id 없거나 모두 root): hierarchical=false
  ///   * flatCategories에 모든 카테고리 + 각각의 항목
  /// - uncategorized: 카테고리에 속하지 않은 항목 (양쪽 공통)
  Future<RepairCategoriesResult> getRepairCategoriesForGuide() async {
    try {
      // 1. 카테고리 조회 (parent_category_id 포함 시도, 실패 시 fallback)
      List<Map<String, dynamic>> allCats;
      bool hasParentColumn = true;

      try {
        final response = await _supabase
            .from('repair_categories')
            .select('id, name, display_order, icon_name, is_active, parent_category_id')
            .eq('is_active', true)
            .order('display_order', ascending: true);
        allCats = (response as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      } catch (_) {
        // parent_category_id 컬럼이 없는 환경 → fallback
        hasParentColumn = false;
        final response = await _supabase
            .from('repair_categories')
            .select('id, name, display_order, icon_name, is_active')
            .eq('is_active', true)
            .order('display_order', ascending: true);
        allCats = (response as List)
            .map(
              (e) => {
                ...Map<String, dynamic>.from(e as Map),
                'parent_category_id': null,
              },
            )
            .toList();
      }

      // 2. 항목 조회
      final typeResponse = await _supabase
          .from('repair_types')
          .select('id, name, description, price, category_id, display_order')
          .eq('is_active', true)
          .order('display_order', ascending: true);
      final allTypes = (typeResponse as List)
          .map((e) => RepairTypeItem.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList();

      // 3. 계층 구조 조립
      if (hasParentColumn) {
        final mainCatsRaw =
            allCats.where((c) => c['parent_category_id'] == null).toList();
        final subCatsRaw =
            allCats.where((c) => c['parent_category_id'] != null).toList();

        if (mainCatsRaw.isNotEmpty) {
          final mainCategories = mainCatsRaw.map((main) {
            final mainId = main['id'].toString();
            final subs = subCatsRaw
                .where((s) => s['parent_category_id'].toString() == mainId)
                .map((sub) {
              final subId = sub['id'].toString();
              return RepairSubCategory(
                id: subId,
                name: (sub['name'] as String?) ?? '',
                displayOrder: (sub['display_order'] as num?) ?? 999,
                repairTypes:
                    allTypes.where((t) => t.categoryId == subId).toList(),
              );
            }).toList();

            return RepairMainCategory(
              id: mainId,
              name: (main['name'] as String?) ?? '',
              displayOrder: (main['display_order'] as num?) ?? 999,
              subCategories: subs,
              repairTypes:
                  allTypes.where((t) => t.categoryId == mainId).toList(),
            );
          }).toList();

          // 어느 대카테고리에도 속하지 않은 소카테고리 (orphan)
          final mainIds = mainCatsRaw.map((m) => m['id'].toString()).toSet();
          final orphanSubs = subCatsRaw
              .where(
                (s) => !mainIds.contains(s['parent_category_id'].toString()),
              )
              .map((sub) {
            final subId = sub['id'].toString();
            return RepairSubCategory(
              id: subId,
              name: (sub['name'] as String?) ?? '',
              displayOrder: (sub['display_order'] as num?) ?? 999,
              repairTypes:
                  allTypes.where((t) => t.categoryId == subId).toList(),
            );
          }).toList();

          final allCatIds = allCats.map((c) => c['id'].toString()).toSet();
          final uncategorized = allTypes
              .where((t) => t.categoryId == null || !allCatIds.contains(t.categoryId))
              .toList();

          _logger.i(
            '✅ 가격 안내(계층): main=${mainCategories.length}, orphanSub=${orphanSubs.length}, uncat=${uncategorized.length}',
          );
          return RepairCategoriesResult(
            hierarchical: true,
            mainCategories: mainCategories,
            flatCategories: orphanSubs,
            uncategorized: uncategorized,
          );
        }
      }

      // 4. flat 구조
      final flat = allCats.map((cat) {
        final catId = cat['id'].toString();
        return RepairSubCategory(
          id: catId,
          name: (cat['name'] as String?) ?? '',
          displayOrder: (cat['display_order'] as num?) ?? 999,
          repairTypes: allTypes.where((t) => t.categoryId == catId).toList(),
        );
      }).toList();

      final allCatIds = allCats.map((c) => c['id'].toString()).toSet();
      final uncategorized = allTypes
          .where((t) => t.categoryId == null || !allCatIds.contains(t.categoryId))
          .toList();

      _logger.i(
        '✅ 가격 안내(flat): cat=${flat.length}, uncat=${uncategorized.length}',
      );
      return RepairCategoriesResult(
        hierarchical: false,
        mainCategories: const [],
        flatCategories: flat,
        uncategorized: uncategorized,
      );
    } catch (e) {
      _logger.e('❌ 가격 안내 데이터 조회 실패: $e');
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


