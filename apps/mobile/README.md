# 모두의수선 - Mobile App (Flutter)

모두의수선 고객용 모바일 앱

## 📱 기능

### 인증
- [x] 스플래시 화면
- [x] 로그인/회원가입 UI
- [ ] Supabase Auth 연동
- [ ] 소셜 로그인 (Google, Apple)

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

### Android (Play)

| 항목 | 값 |
|---|---|
| Application ID | `com.modurepair.app` |
| Play App ID | `4975768727608817713` |
| 현재 트랙 | 비공개 테스트(Alpha) `1.0.0 (4)` — 검토 중 |
| 스토어 문구 | [`STORE_LISTING_KR.md`](./STORE_LISTING_KR.md) |
| 그래픽 자산 | `store_screenshots/play/` |

**서명 (업로드 키)**  
- `android/key.properties` + `android/app/upload-keystore.jks` — **커밋 금지**  
- 백업: `Documents/modo-android-signing/` (분실 시 Play 업데이트 불가에 가깝게 막힘)

```bash
# Play 업로드용 (권장)
flutter build appbundle --release
# → build/app/outputs/bundle/release/app-release.aab

# 직접 설치용
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
# 사이드로드 시 Play Protect 「악성앱」 경고가 날 수 있음(신규 서명 키·스토어 미경유). 본인 빌드면 무시 가능.
# 정식 테스트는 Play 내부/비공개 테스트 링크로 설치.
```

### iOS
```bash
# App Store용
flutter build ipa --release
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

