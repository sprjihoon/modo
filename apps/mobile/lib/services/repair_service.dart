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
  final num? price;
  final List<RepairTypeItem> repairTypes;

  const RepairSubCategory({
    required this.id,
    required this.name,
    required this.displayOrder,
    this.price,
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

  /// 수선 카테고리 목록 조회 (대카테고리만 - parent_category_id IS NULL)
  Future<List<Map<String, dynamic>>> getCategories() async {
    try {
      final response = await _supabase
          .from('repair_categories')
          .select()
          .eq('is_active', true)
          .isFilter('parent_category_id', null)
          .order('display_order', ascending: true);

      // isFilter가 PostgREST에서 의도대로 동작하지 않는 경우를 대비해
      // Dart에서도 parent_category_id == null 인 것만 필터링
      final all = (response as List<dynamic>)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      final topLevel =
          all.where((e) => e['parent_category_id'] == null).toList();

      _logger.i(
          '✅ 수선 카테고리 조회 성공: 전체 ${all.length}개 → 대카테고리 ${topLevel.length}개');
      return topLevel;
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
            .select('id, name, display_order, icon_name, is_active, parent_category_id, price, description')
            .eq('is_active', true)
            .order('display_order', ascending: true);
        allCats = (response as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      } catch (_) {
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
          final mainIds = mainCatsRaw.map((m) => m['id'].toString()).toSet();

          // 대카테고리 직속 자식 카테고리 ID set (중간 소카테고리 + 직접가격 항목)
          final directChildIds = subCatsRaw
              .where((s) => mainIds.contains(s['parent_category_id'].toString()))
              .map((s) => s['id'].toString())
              .toSet();

          final mainCategories = mainCatsRaw.map((main) {
            final mainId = main['id'].toString();

            // 대카테고리의 직속 자식 (소카테고리 + 직접가격 항목)
            final directChildren = subCatsRaw
                .where((s) => s['parent_category_id'].toString() == mainId)
                .toList();

            final subs = directChildren.map((sub) {
              final subId = sub['id'].toString();
              final subPrice = sub['price'] as num?;

              // 3단계: 이 소카테고리의 자식 카테고리 (세부항목)
              final thirdLevel = subCatsRaw
                  .where((s) => s['parent_category_id'].toString() == subId)
                  .toList();

              // repair_types 에서 가져온 항목
              final directRepairTypes =
                  allTypes.where((t) => t.categoryId == subId).toList();

              // 3단계 자식 카테고리를 RepairTypeItem 으로 변환하여 포함
              final thirdLevelItems = thirdLevel.map((item) {
                return RepairTypeItem(
                  id: item['id'].toString(),
                  name: (item['name'] as String?) ?? '',
                  description: item['description'] as String?,
                  price: item['price'] as num?,
                  categoryId: subId,
                );
              }).toList();

              // 3단계 항목의 repair_types 도 포함
              final thirdLevelRepairTypes = thirdLevel.expand((item) {
                final itemId = item['id'].toString();
                return allTypes.where((t) => t.categoryId == itemId);
              }).toList();

              final combinedRepairTypes = [
                ...directRepairTypes,
                ...thirdLevelItems,
                ...thirdLevelRepairTypes,
              ];

              return RepairSubCategory(
                id: subId,
                name: (sub['name'] as String?) ?? '',
                displayOrder: (sub['display_order'] as num?) ?? 999,
                price: subPrice,
                repairTypes: combinedRepairTypes,
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

          // 어느 대카테고리에도 속하지 않고, 대카테고리 직속 자식의 하위도 아닌 orphan
          final allKnownParentIds = {...mainIds, ...directChildIds};
          final orphanSubs = subCatsRaw
              .where(
                (s) => !allKnownParentIds.contains(s['parent_category_id'].toString()),
              )
              .map((sub) {
            final subId = sub['id'].toString();
            return RepairSubCategory(
              id: subId,
              name: (sub['name'] as String?) ?? '',
              displayOrder: (sub['display_order'] as num?) ?? 999,
              price: sub['price'] as num?,
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
          price: cat['price'] as num?,
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


