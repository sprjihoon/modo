import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/json_deep_copy.dart';

/// 수선 항목 목록을 관리하는 Provider
class RepairItemsNotifier extends StateNotifier<List<Map<String, dynamic>>> {
  RepairItemsNotifier() : super([]);
  
  /// 수선 항목 추가 (JSON 기반 깊은 복사)
  void addItem(Map<String, dynamic> item) {
    try {
      final itemCopy = JsonDeepCopy.copyMap(item);
      state = [...state, itemCopy];
    } catch (e) {
      print('❌ addItem 복사 오류: $e');
      // 복사 실패 시 원본 사용하지 않고 에러
      rethrow;
    }
  }
  
  /// 수선 항목 추가 (여러 개, JSON 기반 깊은 복사)
  void addItems(List<Map<String, dynamic>> items) {
    try {
      final itemsCopy = JsonDeepCopy.copyRepairItems(items);
      state = [...state, ...itemsCopy];
    } catch (e) {
      print('❌ addItems 복사 오류: $e');
      rethrow;
    }
  }
  
  /// 수선 항목 제거
  void removeItem(int index) {
    final newState = List<Map<String, dynamic>>.from(state);
    newState.removeAt(index);
    state = newState;
  }
  
  /// 모든 항목 초기화
  void clear() {
    state = [];
  }
  
  /// 수선 항목 설정 (교체, JSON 기반 완전히 새로운 state)
  void setItems(List<Map<String, dynamic>> items) {
    try {
      print('🔄 setItems 호출: ${items.length}개 항목');
      
      // JSON 인코딩/디코딩으로 완전한 깊은 복사
      final itemsCopy = JsonDeepCopy.copyRepairItems(items);
      
      print('✅ setItems 복사 성공: ${itemsCopy.length}개');
      state = itemsCopy;
    } catch (e, stackTrace) {
      // 에러 발생 시 상세 로그 출력
      print('❌ setItems 복사 중 오류: $e');
      print('Stack: $stackTrace');
      print('Items: $items');
      
      // 빈 state로 초기화
      state = [];
      rethrow;
    }
  }
}

/// 수선 항목 목록 Provider
final repairItemsProvider = StateNotifierProvider<RepairItemsNotifier, List<Map<String, dynamic>>>((ref) {
  return RepairItemsNotifier();
});

