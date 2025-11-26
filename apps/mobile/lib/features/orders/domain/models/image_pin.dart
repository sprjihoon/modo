import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

/// 이미지 위의 핀 데이터 모델
class ImagePin {
  /// 핀 고유 ID
  final String id;
  
  /// 핀의 상대적 위치 (0.0 ~ 1.0)
  /// 이미지 크기에 상관없이 위치를 유지하기 위해 상대 좌표 사용
  final Offset relativePosition;
  
  /// 핀에 연결된 메모
  final String memo;
  
  /// 핀 생성 시간
  final DateTime createdAt;
  
  /// 핀 수정 시간
  final DateTime updatedAt;

  ImagePin({
    String? id,
    required this.relativePosition,
    required this.memo,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  /// 핀 복사 (위치 변경용)
  ImagePin copyWith({
    String? id,
    Offset? relativePosition,
    String? memo,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ImagePin(
      id: id ?? this.id,
      relativePosition: relativePosition ?? this.relativePosition,
      memo: memo ?? this.memo,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
    );
  }

  /// JSON으로 변환
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'relative_x': relativePosition.dx,
      'relative_y': relativePosition.dy,
      'memo': memo,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  /// JSON에서 생성
  factory ImagePin.fromJson(Map<String, dynamic> json) {
    try {
      return ImagePin(
        id: json['id'] as String? ?? const Uuid().v4(),
        relativePosition: Offset(
          ((json['relative_x'] ?? json['x'] ?? 0.5) as num).toDouble(),
          ((json['relative_y'] ?? json['y'] ?? 0.5) as num).toDouble(),
        ),
        memo: json['memo'] as String? ?? '',
        createdAt: json['created_at'] != null 
            ? DateTime.parse(json['created_at'] as String)
            : DateTime.now(),
        updatedAt: json['updated_at'] != null
            ? DateTime.parse(json['updated_at'] as String)
            : DateTime.now(),
      );
    } catch (e) {
      // 파싱 실패 시 기본값으로 생성
      return ImagePin(
        relativePosition: const Offset(0.5, 0.5),
        memo: '',
      );
    }
  }

  @override
  String toString() {
    return 'ImagePin(id: $id, position: $relativePosition, memo: $memo)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ImagePin && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}

