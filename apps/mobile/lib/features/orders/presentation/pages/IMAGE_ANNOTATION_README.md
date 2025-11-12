# 이미지 핀 주석 기능 (Image Annotation)

의류 사진에 핀을 추가하고 메모를 달 수 있는 기능입니다. 수선 부위 표시, 하자 위치 표시 등에 활용할 수 있습니다.

## 주요 기능

✅ 의류 사진 업로드 (갤러리/카메라)
✅ 이미지 위 특정 지점 탭하여 핀 생성
✅ 핀에 메모 작성 및 수정
✅ 핀 드래그로 위치 이동
✅ 핀 삭제 기능
✅ 최대 20개까지 핀 추가 가능
✅ 상대 좌표 사용으로 이미지 크기 변경 시에도 위치 유지

## 파일 구조

```
lib/features/orders/
├── domain/
│   └── models/
│       └── image_pin.dart              # 핀 데이터 모델
├── presentation/
    ├── pages/
    │   └── image_annotation_page.dart  # 메인 페이지
    └── widgets/
        ├── image_pin_editor.dart       # 핀 에디터 위젯
        ├── pin_marker.dart             # 핀 마커 UI
        └── pin_memo_bottom_sheet.dart  # 메모 입력 바텀시트
```

## 사용 방법

### 1. GoRouter를 통한 네비게이션

```dart
import 'package:go_router/go_router.dart';
import '../../features/orders/domain/models/image_pin.dart';

// 기본 사용 (새로운 이미지 선택)
context.push('/image-annotation');

// 초기 이미지와 함께 사용
context.push(
  '/image-annotation',
  extra: {
    'imagePath': '/path/to/image.jpg',
  },
);

// 기존 핀 데이터와 함께 사용 (편집 모드)
context.push(
  '/image-annotation',
  extra: {
    'imagePath': '/path/to/image.jpg',
    'pins': existingPins, // List<ImagePin>
  },
);

// 완료 콜백과 함께 사용
context.push(
  '/image-annotation',
  extra: {
    'imagePath': '/path/to/image.jpg',
    'onComplete': (String imagePath, List<ImagePin> pins) {
      print('이미지: $imagePath');
      print('핀 개수: ${pins.length}');
      // 서버에 저장하거나 다른 처리
    },
  },
);
```

### 2. 직접 위젯 사용

페이지를 직접 push하여 결과를 받을 수도 있습니다:

```dart
final result = await Navigator.of(context).push(
  MaterialPageRoute(
    builder: (context) => ImageAnnotationPage(
      initialImagePath: '/path/to/image.jpg',
      initialPins: existingPins,
    ),
  ),
);

if (result != null) {
  final imagePath = result['imagePath'] as String;
  final pins = result['pins'] as List<ImagePin>;
  
  print('이미지: $imagePath');
  print('핀 개수: ${pins.length}');
  
  // 핀 데이터 활용
  for (var pin in pins) {
    print('핀 ID: ${pin.id}');
    print('메모: ${pin.memo}');
    print('위치: (${pin.relativePosition.dx}, ${pin.relativePosition.dy})');
  }
}
```

### 3. ImagePinEditor 위젯 직접 사용

커스텀 페이지에서 에디터 위젯만 사용할 수도 있습니다:

```dart
import '../widgets/image_pin_editor.dart';
import '../../domain/models/image_pin.dart';

class CustomPage extends StatefulWidget {
  @override
  State<CustomPage> createState() => _CustomPageState();
}

class _CustomPageState extends State<CustomPage> {
  List<ImagePin> _pins = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('커스텀 에디터')),
      body: ImagePinEditor(
        imagePath: '/path/to/image.jpg', // 또는 URL
        initialPins: _pins,
        onPinsChanged: (pins) {
          setState(() {
            _pins = pins;
          });
          print('핀 업데이트: ${pins.length}개');
        },
        pinColor: Colors.blue, // 핀 색상 변경 가능
        maxPins: 10, // 최대 핀 개수 제한
      ),
    );
  }
}
```

## ImagePin 모델

```dart
class ImagePin {
  final String id;                    // 고유 ID (UUID)
  final Offset relativePosition;      // 상대 좌표 (0.0 ~ 1.0)
  final String memo;                  // 메모 내용
  final DateTime createdAt;           // 생성 시간
  final DateTime updatedAt;           // 수정 시간
  
  // JSON 변환
  Map<String, dynamic> toJson();
  factory ImagePin.fromJson(Map<String, dynamic> json);
  
  // 핀 복사 (수정용)
  ImagePin copyWith({...});
}
```

### 핀 데이터 저장 및 불러오기

```dart
// JSON으로 변환하여 저장
final pinsJson = pins.map((pin) => pin.toJson()).toList();
await saveToServer(pinsJson); // 또는 로컬 스토리지

// JSON에서 불러오기
final loadedPins = (jsonData as List)
    .map((json) => ImagePin.fromJson(json))
    .toList();
```

## 실제 사용 예시

### 수선 주문에서 활용

```dart
class RepairOrderPage extends StatefulWidget {
  @override
  State<RepairOrderPage> createState() => _RepairOrderPageState();
}

class _RepairOrderPageState extends State<RepairOrderPage> {
  String? _clothingImagePath;
  List<ImagePin> _repairPoints = [];

  Future<void> _selectRepairPoints() async {
    final result = await context.push('/image-annotation', extra: {
      'imagePath': _clothingImagePath,
      'pins': _repairPoints,
    });
    
    if (result != null) {
      setState(() {
        _clothingImagePath = result['imagePath'];
        _repairPoints = result['pins'];
      });
    }
  }

  Future<void> _submitOrder() async {
    // 주문 데이터 생성
    final orderData = {
      'clothing_image': _clothingImagePath,
      'repair_points': _repairPoints.map((p) => p.toJson()).toList(),
    };
    
    // 서버에 전송
    await submitRepairOrder(orderData);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('수선 주문')),
      body: Column(
        children: [
          // 이미지 표시
          if (_clothingImagePath != null)
            Image.file(File(_clothingImagePath!)),
          
          // 수선 부위 표시 버튼
          ElevatedButton(
            onPressed: _selectRepairPoints,
            child: Text('수선 부위 표시 (${_repairPoints.length}개)'),
          ),
          
          // 핀 목록
          Expanded(
            child: ListView.builder(
              itemCount: _repairPoints.length,
              itemBuilder: (context, index) {
                final pin = _repairPoints[index];
                return ListTile(
                  leading: Icon(Icons.push_pin, color: Colors.red),
                  title: Text(pin.memo),
                  subtitle: Text(
                    '위치: (${(pin.relativePosition.dx * 100).toStringAsFixed(1)}%, '
                    '${(pin.relativePosition.dy * 100).toStringAsFixed(1)}%)',
                  ),
                );
              },
            ),
          ),
          
          // 주문하기 버튼
          ElevatedButton(
            onPressed: _repairPoints.isEmpty ? null : _submitOrder,
            child: Text('주문하기'),
          ),
        ],
      ),
    );
  }
}
```

## 커스터마이징

### 핀 색상 변경

```dart
ImagePinEditor(
  imagePath: imagePath,
  pinColor: Colors.green, // 기본값: Colors.red
  // ...
)
```

### 최대 핀 개수 제한

```dart
ImagePinEditor(
  imagePath: imagePath,
  maxPins: 5, // 기본값: 20
  // ...
)
```

### 메모 바텀시트 직접 호출

```dart
final memo = await PinMemoBottomSheet.showMemoBottomSheet(
  context,
  initialMemo: '기존 메모',
);

if (memo != null) {
  print('입력된 메모: $memo');
}
```

## 주의사항

1. **이미지 경로**: 로컬 파일 경로 또는 HTTP(S) URL 모두 지원합니다.
2. **상대 좌표**: 핀 위치는 0.0 ~ 1.0 범위의 상대 좌표로 저장되어 이미지 크기가 변경되어도 위치가 유지됩니다.
3. **메모 필수**: 핀을 추가할 때 메모를 반드시 입력해야 합니다 (빈 메모는 저장 불가).
4. **최대 핀 개수**: 기본값은 20개이며, `maxPins` 파라미터로 변경 가능합니다.

## 향후 개선 가능 사항

- [ ] 핀 스타일 커스터마이징 (아이콘, 크기 등)
- [ ] 핀 그룹화 기능
- [ ] 이미지 줌/팬 기능
- [ ] 실행 취소/다시 실행 기능
- [ ] 핀 간 연결선 그리기
- [ ] 음성 메모 지원
- [ ] 핀에 사진 첨부 기능

