# 🧪 Flutter 앱 테스트 가이드

## Step 1: Feature Flag 활성화

**파일:** `lib/core/config/feature_flags.dart`

```dart
class VideoFeatureFlags {
  // 🚀 테스트 모드: 베타 모드 활성화
  static const bool betaMode = true;  // ← 이 줄을 true로 변경
  
  // 개별 설정 (betaMode가 true면 무시됨)
  static const bool useMediaKit = false;
  static const bool useVideoCache = true;
  static const bool useAdaptiveBitrate = true;
  static const bool useVideoPreload = true;
  
  // 디버그 로그
  static const bool enableDebugLogs = true;
}
```

---

## Step 2: 앱 실행

```bash
cd modo/apps/mobile

# 패키지 설치 (처음 한 번만)
flutter pub get

# 앱 실행
flutter run --debug

# 특정 디바이스로 실행
flutter devices  # 디바이스 목록 확인
flutter run -d [device-id]
```

**예상 출력:**
```
Launching lib/main.dart on iPhone 15 Pro in debug mode...
✅ .env 파일 로드 완료
✅ Supabase 설정 확인됨
✅ Supabase 초기화 완료
🚀 Video Feature Flags Status:
   Beta Mode: true
   Use media_kit: true
   Use Cache: true
   Use ABR: true
   Use Preload: true
ℹ️ media_kit 미사용 (Feature Flag: OFF)
   (주의: media_kit 패키지가 아직 설치되지 않음)
```

---

## Step 3: 기본 테스트 (현재 video_player 사용)

### 테스트 1: 영상 재생

**시나리오:**
1. 앱 실행 → 로그인
2. "내 주문" 탭
3. 주문 하나 선택
4. "영상 보기" 버튼 클릭

**확인 사항:**
- [ ] 영상 로딩 시작
- [ ] "전후 비교 영상" 인트로 표시
- [ ] 좌측: "수선 전" 라벨
- [ ] 우측: "수선 후" 라벨
- [ ] 자동으로 재생 시작
- [ ] Adaptive Duration 작동 (속도 조절)

**콘솔 로그:**
```
📹 Using video_player (legacy)
📹 입고 영상 길이: 15.2초
📹 출고 영상 길이: 18.5초
🎯 Target Duration: 16.9초
⚡ 입고 속도: 0.90x
⚡ 출고 속도: 1.09x
```

---

### 테스트 2: 재생 컨트롤

**확인 사항:**
- [ ] 화면 탭 → 재생/일시정지 버튼 표시
- [ ] 재생/일시정지 작동
- [ ] 두 영상이 동시에 제어됨

---

## Step 4: media_kit 설치 및 테스트 (선택)

### 4.1 패키지 설치

**pubspec.yaml 수정:**

```yaml
dependencies:
  # 기존 (주석 처리)
  # video_player: ^2.8.1
  # chewie: ^1.7.4
  
  # 새로 추가
  media_kit: ^1.1.10
  media_kit_video: ^1.2.4
  media_kit_libs_video: ^1.0.4
  flutter_cache_manager: ^3.3.1
  connectivity_plus: ^5.0.2
```

**설치:**

```bash
flutter pub get
```

### 4.2 main.dart 수정

```dart
// 파일 상단에 추가
import 'package:media_kit/media_kit.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  VideoFeatureFlags.printStatus();
  
  await dotenv.load(fileName: '.env');
  await Supabase.initialize(url: url, anonKey: anonKey);
  
  // media_kit 초기화 추가
  if (VideoFeatureFlags.shouldUseMediaKit) {
    MediaKit.ensureInitialized();  // ← 주석 해제
    print('✅ media_kit 초기화 완료');
  }
  
  runApp(const ProviderScope(child: ModuRepairApp()));
}
```

### 4.3 앱 재실행

```bash
flutter run --debug
```

**예상 콘솔:**
```
🚀 Video Feature Flags Status:
   Beta Mode: true
   Use media_kit: true
✅ media_kit 초기화 완료 (Feature Flag: ON)
```

### 4.4 media_kit 플레이어 테스트

**확인 사항:**
- [ ] 영상 로딩 속도 (이전보다 빠름)
- [ ] 재생 시작 시간 측정
- [ ] 버퍼링 발생 여부
- [ ] 콘솔 로그: "🚀 Using media_kit player"

**콘솔 로그:**
```
🚀 Using media_kit player (enhanced performance)
📹 입고 영상 길이: 15.2초
📹 출고 영상 길이: 18.5초
🎯 Target Duration: 16.9초
⚡ 입고 속도: 0.90x
⚡ 출고 속도: 1.09x
```

---

## Step 5: 캐싱 테스트

### 테스트 1: 첫 재생 (캐시 미스)

1. 영상 재생 페이지 진입
2. **재생 시작 시간 측정** (스톱워치)
3. 뒤로 가기

**예상:** 3-5초

### 테스트 2: 두 번째 재생 (캐시 히트)

1. 다시 같은 영상 재생
2. **재생 시작 시간 측정**
3. 비교

**예상:** 0.5-1초 (90% 빠름!)

**콘솔 로그:**
```
📥 Video cache hit: /data/user/0/.../video_cache/abc123.mp4
⚡ Loading from cache (fast!)
```

---

## Step 6: 네트워크 품질 자동 조절

### 테스트 1: WiFi 환경

1. WiFi 연결 확인
2. 영상 재생
3. 콘솔 확인

**예상 로그:**
```
📡 Network: wifi, Speed: 15.2 Mbps
🎯 Optimal Quality: auto (HD)
```

### 테스트 2: Mobile 데이터 환경

1. WiFi 끄기 → Mobile 데이터 켜기
2. 영상 재생
3. 콘솔 확인

**예상 로그:**
```
📡 Network: mobile, Speed: 4.5 Mbps
🎯 Optimal Quality: sd (720p)
```

### 테스트 3: 느린 네트워크 (3G)

1. 개발자 옵션 → 네트워크 속도 제한
2. 영상 재생

**예상 로그:**
```
📡 Network: mobile, Speed: 1.2 Mbps
🎯 Optimal Quality: low (480p)
```

---

## Step 7: 성능 측정

### 재생 시작 시간

**측정 방법:**
1. 스톱워치 준비
2. "영상 보기" 버튼 클릭과 동시에 시작
3. 첫 프레임 표시 시 정지

**결과 기록:**

| 테스트 | video_player | media_kit | 개선율 |
|--------|-------------|-----------|--------|
| 첫 재생 | __초 | __초 | __% |
| 캐시 재생 | __초 | __초 | __% |

**예상:**
- video_player: 3-5초
- media_kit: 1-2초 (캐시 미스)
- media_kit: 0.5-1초 (캐시 히트)

---

### 메모리 사용량

**측정 방법:**

```bash
# Android
adb shell dumpsys meminfo [package-name]

# iOS
# Xcode > Debug > Memory Report
```

**결과 기록:**

| 시나리오 | video_player | media_kit | 개선율 |
|---------|-------------|-----------|--------|
| 재생 전 | __MB | __MB | __% |
| 재생 중 | __MB | __MB | __% |
| 최대값 | __MB | __MB | __% |

---

### 배터리 소모

**측정 방법:**
1. 배터리 100% 충전
2. 영상 1시간 연속 재생
3. 남은 배터리 확인

**결과 기록:**

| 플레이어 | 소모량 | 개선율 |
|---------|--------|--------|
| video_player | __% | - |
| media_kit | __% | __% |

**예상:**
- video_player: 20%
- media_kit: 14% (-30%)

---

## ✅ 테스트 체크리스트

### 기본 기능
- [ ] 영상 로딩 성공
- [ ] 재생/일시정지 작동
- [ ] Adaptive Duration 작동
- [ ] 좌우 동기화 재생

### media_kit (설치 시)
- [ ] 초기화 성공
- [ ] 플레이어 전환 확인
- [ ] 재생 시작 시간 단축
- [ ] 버퍼링 감소

### 캐싱
- [ ] 첫 재생 후 캐시 생성
- [ ] 두 번째 재생 시 캐시 사용
- [ ] 재생 시작 시간 90% 단축

### 네트워크 적응
- [ ] WiFi: 고화질 선택
- [ ] Mobile: 중화질 선택
- [ ] 3G: 저화질 선택

### 성능
- [ ] 재생 시작 < 2초
- [ ] 메모리 사용 안정적
- [ ] 크래시 없음

---

## 🐛 문제 발생 시

### 1. "media_kit not found"

```bash
flutter clean
flutter pub get
flutter run
```

### 2. Android minSdkVersion 오류

```gradle
// android/app/build.gradle
android {
    defaultConfig {
        minSdkVersion 21  // 21로 변경
    }
}
```

### 3. iOS 빌드 오류

```bash
cd ios
pod install
cd ..
flutter run
```

### 4. 캐싱 안 됨

```dart
// feature_flags.dart
static const bool useVideoCache = true;  // 확인
static const bool betaMode = true;       // 확인
```

---

## 📊 성공 기준

- ✅ 모든 테스트 케이스 통과
- ✅ 재생 시작 < 2초
- ✅ 캐싱 작동 (90% 빠름)
- ✅ 네트워크 적응 작동
- ✅ 크래시 = 0

---

## 🎉 예상 결과

| 지표 | 개선율 |
|------|--------|
| 재생 시작 시간 | **-71%** (3.5초 → 1.0초) |
| 버퍼링 | **-73%** (15% → 4%) |
| 크래시 | **-92%** (2.5% → 0.2%) |
| 데이터 사용 | **-40%** (50MB → 30MB) |
| 배터리 소모 | **-30%** (20% → 14%) |

---

**버전:** 1.0  
**작성일:** 2025-12-18

