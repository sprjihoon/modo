import 'dart:convert';
import 'package:flutter/foundation.dart';

/// JSON 기반 완전한 깊은 복사
/// 모든 참조를 끊고 완전히 새로운 데이터 생성
class JsonDeepCopy {
  /// JSON 인코딩/디코딩을 통한 완전한 깊은 복사
  /// 가장 안전하고 확실한 방법
  static T copy<T>(T data) {
    try {
      // JSON 문자열로 변환 후 다시 파싱
      // 이 과정에서 모든 참조가 끊어짐
      final jsonString = jsonEncode(data);
      final decoded = jsonDecode(jsonString);
      
      if (decoded is T) {
        return decoded;
      }
      
      // 타입이 맞지 않으면 캐스팅
      return decoded as T;
    } catch (e, stackTrace) {
      debugPrint('❌ JSON 깊은 복사 실패: $e');
      debugPrint('Stack: $stackTrace');
      debugPrint('Data type: ${data.runtimeType}');
      rethrow;
    }
  }
  
  /// Map 깊은 복사
  static Map<String, dynamic> copyMap(Map<String, dynamic> map) {
    return copy<Map<String, dynamic>>(map);
  }
  
  /// List 깊은 복사
  static List<dynamic> copyList(List<dynamic> list) {
    return copy<List<dynamic>>(list);
  }
  
  /// repairItems 전용 (타입 보장)
  static List<Map<String, dynamic>> copyRepairItems(List<Map<String, dynamic>> items) {
    try {
      final jsonString = jsonEncode(items);
      final decoded = jsonDecode(jsonString) as List;
      return decoded.map((item) => item as Map<String, dynamic>).toList();
    } catch (e, stackTrace) {
      debugPrint('❌ repairItems 복사 실패: $e');
      debugPrint('Stack: $stackTrace');
      debugPrint('Items count: ${items.length}');
      
      // 개별 항목 복사 시도
      try {
        return items.map((item) {
          final jsonString = jsonEncode(item);
          return jsonDecode(jsonString) as Map<String, dynamic>;
        }).toList();
      } catch (e2) {
        debugPrint('❌ 개별 항목 복사도 실패: $e2');
        throw Exception('repairItems 복사 불가능: 순환 참조 의심');
      }
    }
  }
}

