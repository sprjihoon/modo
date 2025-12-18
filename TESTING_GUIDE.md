# 🧪 영상 처리 개선 테스트 가이드

## 📋 목차

1. [로컬 테스트](#1-로컬-테스트)
2. [성능 벤치마크](#2-성능-벤치마크)
3. [통합 테스트](#3-통합-테스트)
4. [사용자 테스트](#4-사용자-테스트)

---

## 1. 로컬 테스트

### 1.1 관리자 페이지 테스트

#### Step 1: 환경 설정

```bash
cd modo/apps/admin

# .env.local 파일 생성
cat > .env.local << EOF
# 기존 환경 변수
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_stream_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Feature Flags (개발 환경)
NEXT_PUBLIC_USE_TUS_UPLOAD=true
NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
NEXT_PUBLIC_USE_ENHANCED_VIDEO_UI=true
NEXT_PUBLIC_BETA_MODE=true
EOF

# 개발 서버 실행
npm run dev
```

#### Step 2: 업로드 테스트

**준비물:**
- `test-video-10mb.mp4` (10MB)
- `test-video-50mb.mp4` (50MB)  
- `test-video-100mb.mp4` (100MB)

**테스트 케이스:**

```bash
# 1. 기본 업로드 테스트
# http://localhost:3000/dashboard/orders/[order-id]
# - 파일 선택
# - 업로드 버튼 클릭
# - 진행률 확인
# - 성공 메시지 확인

# 2. 네트워크 중단 테스트
# Chrome DevTools > Network > Offline 체크
# 업로드 중 네트워크 끊기
# Offline 해제
# 자동 재개 확인

# 3. 대용량 파일 테스트
# 100MB 파일 업로드
# 메모리 사용량 확인 (Chrome Task Manager)
# 예상: < 300MB
```

#### Step 3: 콘솔 로그 확인

```
예상 출력:
🚀 Using TUS Protocol for resumable upload
📤 Upload progress: 10.0%
📤 Upload progress: 25.0%
📤 Upload progress: 50.0%
📤 Upload progress: 75.0%
📤 Upload progress: 100.0%
✅ Upload completed successfully!
🎬 Video ID: abc123xyz
✅ Media metadata saved to Supabase
```

---

### 1.2 Flutter 앱 테스트

#### Step 1: Feature Flag 활성화

```dart
// lib/core/config/feature_flags.dart
class VideoFeatureFlags {
  static const bool betaMode = true;  // 모든 기능 활성화
  static const bool enableDebugLogs = true;
}
```

#### Step 2: 앱 실행

```bash
cd modo/apps/mobile

# 패키지 설치
flutter pub get

# 앱 실행
flutter run --debug
```

#### Step 3: 비디오 재생 테스트

**테스트 시나리오:**

1. **첫 재생**
   - 주문 상세 → 영상 보기
   - 재생 시작 시간 측정 (스톱워치)
   - 콘솔 확인: "Using media_kit player"

2. **두 번째 재생**
   - 뒤로 가기 → 다시 영상 보기
   - 재생 시작 시간 측정
   - 예상: 첫 재생보다 90% 빠름 (캐시 사용)

3. **네트워크 전환**
   - WiFi 환경에서 재생
   - Mobile 데이터로 전환
   - 품질 자동 조절 확인

#### Step 4: 콘솔 로그 확인

```
예상 출력:
🚀 Video Feature Flags Status:
   Beta Mode: true
   Use media_kit: true
   Use Cache: true
   Use ABR: true
   Use Preload: true
✅ media_kit 초기화 완료 (Feature Flag: ON)
🚀 Using media_kit player (enhanced performance)
📹 입고 영상 길이: 15.2초
📹 출고 영상 길이: 18.5초
🎯 Target Duration: 16.9초
⚡ 입고 속도: 0.90x
⚡ 출고 속도: 1.09x
```

---

## 2. 성능 벤치마크

### 2.1 관리자 페이지 성능

#### 업로드 속도 측정

**테스트 스크립트:**

```bash
#!/bin/bash
# test-upload-speed.sh

echo "=== 업로드 속도 테스트 ==="

# 기존 방식 (TUS OFF)
export NEXT_PUBLIC_USE_TUS_UPLOAD=false
echo "1. 기존 방식 (Direct Upload)"
time curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"test-123\",\"base64\":\"$(base64 < test-video-100mb.mp4)\"}" \
  http://localhost:3000/api/ops/work/stream-upload

# 새 방식 (TUS ON)
export NEXT_PUBLIC_USE_TUS_UPLOAD=true
export NEXT_PUBLIC_USE_DIRECT_FILE_UPLOAD=true
echo "2. 새 방식 (TUS Protocol)"
time curl -X POST \
  -F "file=@test-video-100mb.mp4" \
  -F "orderId=test-123" \
  http://localhost:3000/api/ops/work/stream-upload
```

**실행:**

```bash
chmod +x test-upload-speed.sh
./test-upload-speed.sh
```

**예상 결과:**

| 방식 | 100MB 파일 | 개선율 |
|------|-----------|--------|
| 기존 (Base64) | 180초 | - |
| 새 방식 (TUS) | 60초 | **-67%** ⬇️ |

---

### 2.2 Flutter 앱 성능

#### 재생 시작 시간 측정

**테스트 코드:**

```dart
// test/video_performance_test.dart

import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Video playback performance', (WidgetTester tester) async {
    final stopwatch = Stopwatch()..start();
    
    // 영상 재생 페이지 진입
    await tester.pumpWidget(ComparisonVideoPlayerPage(
      inboundVideoUrl: 'https://...',
      outboundVideoUrl: 'https://...',
    ));
    
    // 첫 프레임 렌더링 대기
    await tester.pumpAndSettle();
    
    stopwatch.stop();
    final startTime = stopwatch.elapsedMilliseconds;
    
    print('재생 시작 시간: ${startTime}ms');
    
    // 기준: 3000ms 이하
    expect(startTime, lessThan(3000));
  });
}
```

**실행:**

```bash
flutter test test/video_performance_test.dart
```

---

### 2.3 메모리 사용량 측정

#### Chrome DevTools

```
1. Chrome DevTools 열기 (F12)
2. Performance 탭
3. Record 버튼 클릭
4. 100MB 파일 업로드
5. Stop 버튼 클릭
6. Memory 그래프 확인
```

**예상:**
- 기존: 500-700MB
- 개선: 200-300MB (-60%)

#### Flutter DevTools

```bash
# DevTools 실행
flutter pub global activate devtools
flutter pub global run devtools

# 앱 실행
flutter run --debug

# DevTools 접속
# http://localhost:9100
```

**메모리 프로파일링:**
1. Memory 탭
2. Record 버튼
3. 영상 재생
4. Snapshot 저장
5. 메모리 사용량 분석

---

## 3. 통합 테스트

### 3.1 E2E 테스트 시나리오

#### 관리자 페이지 워크플로우

```typescript
// e2e/video-upload.spec.ts

import { test, expect } from '@playwright/test';

test('Video upload workflow', async ({ page }) => {
  // 1. 로그인
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // 2. 주문 상세 페이지
  await page.goto('http://localhost:3000/dashboard/orders/test-order-123');
  
  // 3. 입고 영상 업로드
  await page.setInputFiles('[name="inbound-video"]', 'test-video-10mb.mp4');
  
  // 4. 진행률 표시 확인
  await expect(page.locator('.progress-bar')).toBeVisible();
  
  // 5. 업로드 완료 대기
  await expect(page.locator('.upload-success')).toBeVisible({ timeout: 60000 });
  
  // 6. Video ID 확인
  const videoId = await page.locator('.video-id').textContent();
  expect(videoId).toMatch(/^[a-z0-9]{32}$/);
});
```

**실행:**

```bash
npx playwright test
```

---

### 3.2 Flutter Integration Test

```dart
// integration_test/video_playback_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:modu_repair/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Video playback integration', (WidgetTester tester) async {
    // 1. 앱 실행
    app.main();
    await tester.pumpAndSettle();
    
    // 2. 로그인
    await tester.enterText(find.byKey(Key('email')), 'user@test.com');
    await tester.enterText(find.byKey(Key('password')), 'password');
    await tester.tap(find.byKey(Key('login-button')));
    await tester.pumpAndSettle();
    
    // 3. 주문 목록
    await tester.tap(find.text('내 주문'));
    await tester.pumpAndSettle();
    
    // 4. 주문 상세
    await tester.tap(find.text('주문번호: #12345').first);
    await tester.pumpAndSettle();
    
    // 5. 영상 보기
    await tester.tap(find.text('영상 보기'));
    await tester.pumpAndSettle(timeout: Duration(seconds: 10));
    
    // 6. 플레이어 확인
    expect(find.text('수선 전'), findsOneWidget);
    expect(find.text('수선 후'), findsOneWidget);
    
    // 7. 재생/일시정지
    await tester.tap(find.byIcon(Icons.play_arrow));
    await Future.delayed(Duration(seconds: 3));
    await tester.tap(find.byIcon(Icons.pause));
  });
}
```

**실행:**

```bash
flutter test integration_test/video_playback_test.dart
```

---

## 4. 사용자 테스트

### 4.1 베타 테스터 모집

**대상:**
- 내부 직원: 5명
- 파워 유저: 10명
- 일반 사용자: 15명

**기간:** 1주일

---

### 4.2 피드백 수집

**설문지:**

```
1. 영상 업로드 속도는 어떠했나요? (1-5점)
   ☐ 1 (매우 느림)
   ☐ 2 (느림)
   ☐ 3 (보통)
   ☐ 4 (빠름)
   ☐ 5 (매우 빠름)

2. 업로드 중 문제가 발생했나요?
   ☐ 예 (상세 설명: _____________)
   ☐ 아니오

3. 영상 재생이 부드러웠나요? (1-5점)
   ☐ 1 (매우 끊김)
   ☐ 2 (끊김)
   ☐ 3 (보통)
   ☐ 4 (부드러움)
   ☐ 5 (매우 부드러움)

4. 전체적인 만족도는? (1-5점)
   ☐ 1 (매우 불만)
   ☐ 2 (불만)
   ☐ 3 (보통)
   ☐ 4 (만족)
   ☐ 5 (매우 만족)

5. 추가 의견:
   ___________________________________
```

---

### 4.3 성공 기준

**필수 조건:**
- ✅ 평균 만족도 ≥ 4.0/5.0
- ✅ 업로드 실패율 < 3%
- ✅ 크리티컬 버그 = 0
- ✅ 사용자 불만 < 10%

**권장 조건:**
- ⭐ 평균 만족도 ≥ 4.5/5.0
- ⭐ 업로드 실패율 < 1%
- ⭐ 모든 버그 수정 완료

---

## 📊 테스트 결과 템플릿

### 성능 벤치마크 결과

| 지표 | 기존 | 개선 | 개선율 | 목표 | 달성 |
|------|------|------|--------|------|------|
| 업로드 속도 (100MB) | 180초 | __초 | __%  | 90초 | ☐ |
| 업로드 성공률 | 85% | __% | __%  | 95% | ☐ |
| 재생 시작 시간 | 3.5초 | __초 | __%  | 2초 | ☐ |
| 버퍼링 발생률 | 15% | __% | __%  | 8% | ☐ |
| 메모리 사용량 | 500MB | __MB | __%  | 300MB | ☐ |

### 사용자 피드백 요약

**긍정적 피드백:**
- 
- 

**부정적 피드백:**
- 
- 

**개선 사항:**
- 
- 

---

## ✅ 최종 체크리스트

### 관리자 페이지
- [ ] 로컬 테스트 완료
- [ ] 성능 벤치마크 완료
- [ ] 업로드 성공률 > 95%
- [ ] 메모리 사용량 < 300MB
- [ ] E2E 테스트 통과
- [ ] 에러 처리 확인

### Flutter 앱
- [ ] 로컬 테스트 완료
- [ ] 성능 벤치마크 완료
- [ ] 재생 시작 시간 < 2초
- [ ] 캐싱 작동 확인
- [ ] 통합 테스트 통과
- [ ] 다양한 디바이스 테스트

### 사용자 테스트
- [ ] 베타 테스터 모집
- [ ] 피드백 수집
- [ ] 만족도 ≥ 4.0
- [ ] 크리티컬 버그 = 0
- [ ] 최종 승인

---

**버전:** 1.0  
**최종 업데이트:** 2025-12-18  
**작성자:** AI Assistant

