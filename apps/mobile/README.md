# 모두의수선 - Mobile App (Flutter)

모두의수선 고객용 모바일 앱

## 📱 기능

### 인증
- [x] 스플래시 화면
- [x] 로그인/회원가입 UI
- [x] Supabase Auth 연동
- [x] 소셜 로그인/가입 (Google, 네이버, 카카오, Apple)
- [x] 비회원 홈·가격표 둘러보기 (수거/장바구니/결제는 로그인)
- [x] 비밀번호 변경 (이메일 계정만, 현재 비밀번호 재인증)

### 주문
- [x] 홈 화면
- [x] 주문 목록
- [x] 주문 상세 (5단계 타임라인)
- [ ] 수선 접수
- [ ] 결제 연동 (PortOne)

### 영상
- [ ] 입고 영상 재생 (HLS)
- [ ] 출고 영상 재생 (HLS)

### 알림
- [ ] FCM 푸시 알림
- [ ] 앱 내 알림 목록

### 기타
- [ ] 배송 추적
- [ ] 고객센터
- [ ] 마이페이지

## 🚀 시작하기

### 사전 요구사항
- Flutter 3.16 이상
- Dart 3.2 이상
- Android Studio / Xcode

### 설치

```bash
# 의존성 설치
flutter pub get

# 코드 생성 (Riverpod)
flutter pub run build_runner build --delete-conflicting-outputs
```

### 환경 설정

1. `.env` 파일 생성
```bash
# 루트의 env.example 참조
cp ../../env.example .env
```

2. `.env` 파일 편집
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### 실행

```bash
# 개발 모드
flutter run

# 특정 디바이스
flutter run -d <device-id>

# 디바이스 목록 확인
flutter devices
```

### 빌드

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

## 📂 프로젝트 구조

```
lib/
├── main.dart                 # 앱 엔트리포인트
├── app.dart                  # 메인 앱 위젯
├── core/                     # 핵심 기능
│   ├── config/               # 설정 (Supabase, Firebase 등)
│   ├── theme/                # 테마 정의
│   ├── router/               # GoRouter 설정
│   ├── constants/            # 상수
│   └── utils/                # 유틸리티
├── features/                 # 기능별 모듈
│   ├── auth/                 # 인증
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── home/                 # 홈
│   ├── orders/               # 주문
│   ├── videos/               # 영상
│   └── profile/              # 프로필
├── models/                   # 데이터 모델
├── providers/                # Riverpod 프로바이더
├── services/                 # 서비스 (API, Storage 등)
└── widgets/                  # 공통 위젯
```

## 🧩 주요 패키지

### 상태 관리
- `flutter_riverpod` - 상태 관리
- `riverpod_annotation` - 코드 생성

### 라우팅
- `go_router` - 선언적 라우팅

### 백엔드
- `supabase_flutter` - Supabase 클라이언트

### UI
- `flutter_svg` - SVG 이미지
- `cached_network_image` - 이미지 캐싱

### 영상
- `video_player` - 영상 재생
- `chewie` - 영상 플레이어 UI

### 기타
- `dio` - HTTP 클라이언트
- `flutter_dotenv` - 환경변수
- `firebase_messaging` - 푸시 알림
- `image_picker` - 이미지 선택

## 🎨 디자인 시스템

### 컬러
- Primary: `#2563EB` (Blue)
- Secondary: `#8B5CF6` (Purple)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)

### 타이포그래피
- Headline: 28px, Bold
- Title: 20px, Bold
- Body: 16px, Regular
- Caption: 14px, Regular

## 🔐 보안

- 모든 API 키는 `.env` 파일에 저장
- `.env` 파일은 Git에 커밋하지 않음
- Supabase RLS로 데이터 접근 제어

## 🧪 테스트

```bash
# 단위 테스트
flutter test

# 통합 테스트
flutter test integration_test

# 커버리지
flutter test --coverage
```

## 📱 배포

루트 [`README.md`](../../README.md)의 **앱스토어 / Play 출시 준비**가 최신 상태의 기준입니다.

### 맥북에서 `1.0.4+32` (지금 이 빌드)

Windows에서는 IPA/AAB를 만들지 않는다. 맥북에서 `main`을 받은 뒤 아래만 실행한다. `pubspec.yaml`은 이미 `1.0.4+32`. `+31`은 이미 각 마켓에 올라감.

포함 내용: 결제/수거 화면에 입력 수치 · 수치 「이전」은 사진·핀으로 · `+31`의 웹 가입·초대·`og.jpg`.

```bash
git checkout main
git pull
cd apps/mobile
flutter pub get

# Play AAB
flutter build appbundle --release --build-name=1.0.4 --build-number=32
# → build/app/outputs/bundle/release/app-release.aab
# 백업: ~/Documents/modo-android-signing/app-release-1.0.4+32.aab

# App Store / TestFlight IPA
flutter build ipa --release --build-name=1.0.4 --build-number=32 \
  --export-options-plist=ios/ExportOptions.plist
# → build/ios/ipa/모두의수선.ipa
```

심사 중인 **1.0.4 / 31** 을 **32**로 교체한다. Play는 32 AAB를 올린 뒤에만 어드민 **앱 버전**을 `1.0.4+32`로 바꾼다.

### Android (Play)

| 항목 | 값 |
|---|---|
| Application ID | `com.modurepair.app` |
| Play App ID | `4975768727608817713` |
| 현재 트랙 | 비공개 테스트(Alpha) — **`28 (1.0.3)` 테스터 제공** · **`31` 번들 업로드됨** · 다음 업로드 **`32`** · 프로덕션 액세스는 신청 검토 중 (2026-08-28) |
| 버전 | `pubspec.yaml` → `1.0.4+32` · Alpha 테스터는 아직 28 |
| 최근 UX | 결제 전 수치 표시 · 수치 이전은 사진·핀 · 4단계에서만 장바구니 담기 |
| AAB | `build/app/outputs/bundle/release/app-release.aab` · 백업 `~/Documents/modo-android-signing/app-release-1.0.4+32.aab` |
| targetSdk | **36** (Android 16) — `android/app/build.gradle.kts` 고정 · Play 2026-08-31 정책 |
| ProGuard | `android/app/proguard-rules.pro` — Retrofit + `com.navercorp.nid` (릴리즈 minify 필수) |
| 스토어 문구 | [`STORE_LISTING_KR.md`](./STORE_LISTING_KR.md) |
| 그래픽 자산 | `store_screenshots/play/` |

**서명 (업로드 키)**  
- `android/key.properties` + `android/app/upload-keystore.jks` — **커밋 금지**  
- 백업: `Documents/modo-android-signing/` (분실 시 Play 업데이트 불가에 가깝게 막힘)

```bash
# Play 업로드용 (권장)
flutter build appbundle --release
# → build/app/outputs/bundle/release/app-release.aab
# Play Console → 비공개 테스트(Alpha)에 업로드 후 테스터는 스토어에서 업데이트

# 직접 설치용
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
# 사이드로드 시 Play Protect 「악성앱」 경고가 날 수 있음(신규 서명 키·스토어 미경유). 본인 빌드면 무시 가능.
# 정식 테스트는 Play 내부/비공개 테스트 링크로 설치.
```

### iOS (App Store / TestFlight)

| 항목 | 값 |
|---|---|
| Flutter 핀 | **3.35.7** (`ios/ci_scripts/ci_post_clone.sh`, 공식 macOS zip) |
| 스크립트 | `ci_post_clone.sh` / `ci_pre_xcodebuild.sh` — LF 필수 (`.gitattributes`) |
| 서명 | Release/Profile **Manual** · 프로파일 `ModoRepair AppStore` · Team `6R7TSV8PV4` (`ExportOptions.plist`) |
| iOS 배포 타깃 | **15.0** (`Podfile` · `IPHONEOS_DEPLOYMENT_TARGET` · `AppFrameworkInfo.plist`) — ITMS-90068 대응 |
| 최신 업로드 | **`1.0.3 (29)`** 판매 중. **`1.0.4`** 심사는 **32**로 교체 |
| App Store | **판매 중 `1.0.3` 빌드 29** · https://apps.apple.com/kr/app/모두의수선/id6759492888 |
| IPA | `build/ios/ipa/모두의수선.ipa` |
| 시뮬 참고 | Sign in with Apple은 시뮬에서 `AuthorizationError 1000`이 흔함 → **실기기/TestFlight**로 확인 |

```bash
# App Store용 (수동 서명 — Xcode Accounts 없어도 Distribution 인증서+프로파일만 있으면 가능)
flutter build ipa --release --build-name=1.0.4 --build-number=32 \
  --export-options-plist=ios/ExportOptions.plist

# 업로드 (API Key: secrets/asc-api.json, 커밋 금지)
xcrun altool --upload-app --type ios -f build/ios/ipa/*.ipa \
  --apiKey 5NS9QNDJUH --apiIssuer <issuerId>
```

### Firebase App Distribution
```bash
# Android
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_APP_ID \
  --groups testers

# iOS
firebase appdistribution:distribute build/ios/ipa/modu_repair.ipa \
  --app YOUR_APP_ID \
  --groups testers
```

## 📚 참고 자료

- [Flutter 공식 문서](https://flutter.dev/docs)
- [Riverpod 문서](https://riverpod.dev)
- [Supabase Flutter 문서](https://supabase.com/docs/reference/dart)
- [GoRouter 문서](https://pub.dev/packages/go_router)

## 🤝 기여

1. Feature 브랜치 생성
2. 변경사항 커밋
3. Pull Request 생성

## 라이선스

Private Project

