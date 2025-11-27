# 여러 아이템 순차 비디오 재생 기능

## 개요

여러 아이템(1번, 2번, 3번...)의 입고/출고 영상을 **순차적으로 자동 재생**하는 기능입니다.

## 사용 방법

### 1. 단일 아이템 (기존 방식)

```dart
// 단일 아이템의 전후 비교
context.push(
  '/comparison-video',
  extra: {
    'inboundVideoUrl': 'https://...',
    'outboundVideoUrl': 'https://...',
  },
);
```

### 2. 여러 아이템 (순차 재생)

```dart
// 여러 아이템의 순차 재생
context.push(
  '/comparison-video',
  extra: {
    'videoItems': [
      {
        'inbound': 'https://아이템1_입고영상.mp4',
        'outbound': 'https://아이템1_출고영상.mp4',
      },
      {
        'inbound': 'https://아이템2_입고영상.mp4',
        'outbound': 'https://아이템2_출고영상.mp4',
      },
      {
        'inbound': 'https://아이템3_입고영상.mp4',
        'outbound': 'https://아이템3_출고영상.mp4',
      },
    ],
  },
);
```

## 동작 방식

1. **인트로 표시** (0.7초)
   - "전후 비교 영상"
   - "N개 아이템 순차 재생"

2. **아이템 1 재생**
   - 입고/출고 영상 동시 재생
   - Adaptive Duration으로 속도 자동 조절
   - 재생 완료까지 대기

3. **짧은 간격** (0.5초)
   - 다음 아이템으로 전환 준비

4. **아이템 2 재생**
   - 동일한 방식으로 재생

5. **반복**
   - 모든 아이템 순차 재생

6. **완료 후**
   - 첫 번째 아이템으로 돌아가서 다시 재생 (무한 루프)

## UI 요소

### 좌상단: 아이템 번호
```
┌─────────────────┐
│ 아이템 2 / 5    │
│                 │
```

### 좌하단/우하단: 수선 전/후 라벨
```
│ 수선 전         │     │         수선 후 │
└─────────────────┘     └─────────────────┘
```

### 중앙: 재생/일시정지 버튼
- 탭하여 재생/일시정지 토글

### 우상단: 로고 아이콘
- 가위 아이콘 (수선 상징)

## 기술적 세부사항

### Adaptive Duration
- 입고/출고 영상 길이가 다를 때 자동 속도 조절
- 두 영상이 동시에 끝나도록 보장

### 메모리 관리
- 각 아이템 재생 전 이전 컨트롤러 해제
- 메모리 누수 방지

### 에러 처리
- 개별 아이템 재생 실패 시 다음 아이템으로 진행
- 전체 재생 중단 방지

## 예제: 주문 상세 페이지 통합

```dart
// order_detail_page.dart에서 사용

// 1. 주문의 모든 아이템 영상 수집
final List<Map<String, String>> videoItems = [];

for (var item in order['repair_items']) {
  final inboundVideo = await _getItemInboundVideo(item['id']);
  final outboundVideo = await _getItemOutboundVideo(item['id']);
  
  if (inboundVideo != null && outboundVideo != null) {
    videoItems.add({
      'inbound': inboundVideo,
      'outbound': outboundVideo,
    });
  }
}

// 2. 영상이 여러 개면 순차 재생, 하나면 단일 재생
if (videoItems.length > 1) {
  context.push('/comparison-video', extra: {
    'videoItems': videoItems,
  });
} else if (videoItems.length == 1) {
  context.push('/comparison-video', extra: {
    'inboundVideoUrl': videoItems[0]['inbound'],
    'outboundVideoUrl': videoItems[0]['outbound'],
  });
}
```

## 설정 옵션

### introDuration
- 인트로 표시 시간
- 기본값: 700ms

### intervalDuration
- 아이템 간 간격 시간
- 기본값: 500ms

```dart
SequentialComparisonPlayer(
  videoItems: videoItems,
  introDuration: Duration(milliseconds: 1000),
  intervalDuration: Duration(seconds: 1),
)
```

## 주의사항

1. **네트워크 사용량**
   - 여러 영상을 순차 로드하므로 데이터 사용량 증가
   - WiFi 환경 권장

2. **재생 시간**
   - 아이템이 많을수록 전체 재생 시간 증가
   - 적절한 간격 설정 권장

3. **영상 품질**
   - 모든 아이템 영상이 유효해야 원활한 재생 가능
   - 누락된 영상은 자동으로 스킵

## 향후 개선 사항

- [ ] 프리로딩: 다음 아이템 미리 로드
- [ ] 스킵 버튼: 특정 아이템으로 바로 이동
- [ ] 진행도 바: 전체 재생 진행 상황 표시
- [ ] 속도 조절: 사용자가 재생 속도 직접 조정

