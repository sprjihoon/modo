import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 수선 항목 목록을 관리하는 Provider
class RepairItemsNotifier extends StateNotifier<List<Map<String, dynamic>>> {
  RepairItemsNotifier() : super([]);
  
  /// 수선 항목 추가
  void addItem(Map<String, dynamic> item) {
    state = [...state, item];
  }
  
  /// 수선 항목 추가 (여러 개)
  void addItems(List<Map<String, dynamic>> items) {
    state = [...state, ...items];
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
  
  /// 수선 항목 설정 (교체)
  void setItems(List<Map<String, dynamic>> items) {
    state = items;
  }
}

/// 수선 항목 목록 Provider
final repairItemsProvider = StateNotifierProvider<RepairItemsNotifier, List<Map<String, dynamic>>>((ref) {
  return RepairItemsNotifier();
});

