import 'package:flutter/foundation.dart';

/// 깊은 복사 유틸리티
/// Maximum call stack size exceeded 방지를 위한 안전한 데이터 복사
class DeepCopyUtil {
  /// Map을 깊은 복사 (순환 참조 방지)
  static Map<String, dynamic> copyMap(Map<String, dynamic> source, {int depth = 0}) {
    if (depth > 10) {
      // 깊이 제한: 10단계 이상 중첩되면 순환 참조로 간주
      throw Exception('순환 참조 감지: 깊이 $depth 초과');
    }
    
    final result = <String, dynamic>{};
    
    for (final entry in source.entries) {
      final key = entry.key;
      final value = entry.value;
      
      if (value == null) {
        result[key] = null;
      } else if (value is Map<String, dynamic>) {
        result[key] = copyMap(value, depth: depth + 1);
      } else if (value is Map) {
        result[key] = copyMap(Map<String, dynamic>.from(value), depth: depth + 1);
      } else if (value is List) {
        result[key] = copyList(value, depth: depth + 1);
      } else if (value is String || value is num || value is bool) {
        result[key] = value;
      } else {
        // 알 수 없는 타입은 toString()으로 변환
        result[key] = value.toString();
      }
    }
    
    return result;
  }
  
  /// List를 깊은 복사 (순환 참조 방지)
  static List<dynamic> copyList(List<dynamic> source, {int depth = 0}) {
    if (depth > 10) {
      throw Exception('순환 참조 감지: 깊이 $depth 초과');
    }
    
    return source.map((item) {
      if (item == null) {
        return null;
      } else if (item is Map<String, dynamic>) {
        return copyMap(item, depth: depth + 1);
      } else if (item is Map) {
        return copyMap(Map<String, dynamic>.from(item), depth: depth + 1);
      } else if (item is List) {
        return copyList(item, depth: depth + 1);
      } else if (item is String || item is num || item is bool) {
        return item;
      } else {
        return item.toString();
      }
    }).toList();
  }
  
  /// repairItems 전용 깊은 복사 (최적화됨)
  static List<Map<String, dynamic>> copyRepairItems(List<Map<String, dynamic>> items) {
    try {
      return items.map((item) {
        final itemCopy = <String, dynamic>{};
        
        // 기본 필드들 복사 (primitive 타입)
        for (final key in ['id', 'repairPart', 'priceRange', 'price', 'scope', 'measurement']) {
          if (item.containsKey(key)) {
            itemCopy[key] = item[key];
          }
        }
        
        // selectedParts (optional) - 문자열 리스트
        if (item.containsKey('selectedParts')) {
          final selectedParts = item['selectedParts'];
          if (selectedParts is List) {
            itemCopy['selectedParts'] = selectedParts.map((e) => e.toString()).toList();
          }
        }
        
        // detailedMeasurements (optional) - 깊은 복사
        if (item.containsKey('detailedMeasurements')) {
          final measurements = item['detailedMeasurements'];
          if (measurements is List) {
            itemCopy['detailedMeasurements'] = measurements.map((m) {
              if (m is Map) {
                final mCopy = <String, dynamic>{};
                for (final entry in m.entries) {
                  if (entry.value is List) {
                    mCopy[entry.key] = (entry.value as List).map((v) {
                      if (v is Map) {
                        return Map<String, dynamic>.from(v);
                      }
                      return v;
                    }).toList();
                  } else {
                    mCopy[entry.key] = entry.value;
                  }
                }
                return mCopy;
              }
              return m;
            }).toList();
          }
        }
        
        // itemImages - 가장 중요! 완전한 깊은 복사
        if (item.containsKey('itemImages')) {
          final itemImages = item['itemImages'];
          if (itemImages is List) {
            itemCopy['itemImages'] = itemImages.map((img) {
              if (img is Map) {
                final imgCopy = <String, dynamic>{
                  'imagePath': img['imagePath']?.toString() ?? '',
                };
                
                // pins를 완전히 새로운 Map으로 복사
                final pins = img['pins'];
                if (pins is List) {
                  imgCopy['pins'] = pins.map((pin) {
                    if (pin is Map) {
                      // 모든 필드를 명시적으로 복사
                      return <String, dynamic>{
                        'id': pin['id']?.toString() ?? '',
                        'relative_x': pin['relative_x'] ?? 0.5,
                        'relative_y': pin['relative_y'] ?? 0.5,
                        'memo': pin['memo']?.toString() ?? '',
                        'created_at': pin['created_at']?.toString() ?? '',
                        'updated_at': pin['updated_at']?.toString() ?? '',
                      };
                    }
                    return pin;
                  }).toList();
                } else {
                  imgCopy['pins'] = [];
                }
                
                return imgCopy;
              }
              return img;
            }).toList();
          }
        }
        
        return itemCopy;
      }).toList();
    } catch (e, stackTrace) {
      debugPrint('❌ repairItems 복사 실패: $e');
      debugPrint('Stack: $stackTrace');
      throw Exception('repairItems 복사 실패: $e');
    }
  }
}

