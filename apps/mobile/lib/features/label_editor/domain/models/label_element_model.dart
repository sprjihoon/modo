/// 라벨 요소 데이터 모델
class LabelElementModel {
  final String fieldKey; // DB 매핑 키
  final String label; // 버튼 이름
  final String exampleValue; // 화면에 보일 예시 값
  final double x; // X 좌표 (px)
  final double y; // Y 좌표 (px)
  final double width; // 너비 (px)
  final double height; // 높이 (px)
  final LabelFieldStyle style; // 스타일 정보
  final LabelFieldType type; // 필드 타입 (텍스트/바코드)

  LabelElementModel({
    required this.fieldKey,
    required this.label,
    required this.exampleValue,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.style,
    this.type = LabelFieldType.text,
  });

  /// JSON으로 변환 (저장용)
  Map<String, dynamic> toJson() {
    return {
      'fieldKey': fieldKey,
      'label': label,
      'exampleValue': exampleValue,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'style': style.toJson(),
      'type': type.name,
    };
  }

  /// JSON에서 생성
  factory LabelElementModel.fromJson(Map<String, dynamic> json) {
    return LabelElementModel(
      fieldKey: json['fieldKey'] as String,
      label: json['label'] as String,
      exampleValue: json['exampleValue'] as String,
      x: (json['x'] as num).toDouble(),
      y: (json['y'] as num).toDouble(),
      width: (json['width'] as num).toDouble(),
      height: (json['height'] as num).toDouble(),
      style: LabelFieldStyle.fromJson(json['style'] as Map<String, dynamic>),
      type: LabelFieldType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => LabelFieldType.text,
      ),
    );
  }

  /// 위치 업데이트
  LabelElementModel copyWith({
    double? x,
    double? y,
    double? width,
    double? height,
  }) {
    return LabelElementModel(
      fieldKey: fieldKey,
      label: label,
      exampleValue: exampleValue,
      x: x ?? this.x,
      y: y ?? this.y,
      width: width ?? this.width,
      height: height ?? this.height,
      style: style,
      type: type,
    );
  }
}

/// 필드 스타일 정보
class LabelFieldStyle {
  final double fontSize; // 폰트 크기
  final bool isBold; // 볼드 여부
  final String? borderColor; // 테두리 색상 (집배코드용)

  LabelFieldStyle({
    required this.fontSize,
    this.isBold = false,
    this.borderColor,
  });

  Map<String, dynamic> toJson() {
    return {
      'fontSize': fontSize,
      'isBold': isBold,
      'borderColor': borderColor,
    };
  }

  factory LabelFieldStyle.fromJson(Map<String, dynamic> json) {
    return LabelFieldStyle(
      fontSize: (json['fontSize'] as num).toDouble(),
      isBold: json['isBold'] as bool? ?? false,
      borderColor: json['borderColor'] as String?,
    );
  }
}

/// 필드 타입
enum LabelFieldType {
  text, // 일반 텍스트
  barcode, // 바코드
}

/// 필드 설정 (팔레트에 표시될 필드 목록)
class FieldConfig {
  final String fieldKey;
  final String label;
  final String exampleValue;
  final LabelFieldStyle style;
  final LabelFieldType type;

  const FieldConfig({
    required this.fieldKey,
    required this.label,
    required this.exampleValue,
    required this.style,
    this.type = LabelFieldType.text,
  });

  /// 기본 필드 목록 정의
  static List<FieldConfig> getDefaultFields() {
    return [
      FieldConfig(
        fieldKey: 'receiver_name',
        label: '받는 분',
        exampleValue: '김철수',
        style: LabelFieldStyle(fontSize: 14),
      ),
      FieldConfig(
        fieldKey: 'full_address',
        label: '전체 주소',
        exampleValue: '서울시 강남구 테헤란로 123',
        style: LabelFieldStyle(fontSize: 12),
      ),
      FieldConfig(
        fieldKey: 'sorting_code',
        label: '집배코드',
        exampleValue: '11-22-33',
        style: LabelFieldStyle(
          fontSize: 24,
          isBold: true,
          borderColor: '#000000', // 집배코드는 테두리 표시
        ),
      ),
      FieldConfig(
        fieldKey: 'tracking_no',
        label: '등기번호(바코드)',
        exampleValue: '123456789012',
        style: LabelFieldStyle(fontSize: 12),
        type: LabelFieldType.barcode,
      ),
      FieldConfig(
        fieldKey: 'msg',
        label: '배송메시지',
        exampleValue: '부재시 문앞',
        style: LabelFieldStyle(fontSize: 10),
      ),
    ];
  }
}

