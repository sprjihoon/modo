# 모두의수선 - 배포 가이드

## 🚀 배포 전략

### 환경 구성

| 환경 | Mobile | Admin | Edge Functions | Database |
|------|--------|-------|----------------|----------|
| **Development** | Local | localhost:3000 | Local (Deno) | Local (Docker) |
| **Staging** | Firebase Distribution | Vercel Preview | Supabase Develop | Supabase Develop |
| **Production** | App/Play Store | Vercel Production | Supabase Main | Supabase Production |

---

## 📱 Mobile App (Flutter)

### 개발 환경

```bash
# 의존성 설치
cd apps/mobile
flutter pub get

# 코드 생성
flutter pub run build_runner build --delete-conflicting-outputs

# 개발 실행
flutter run

# 특정 디바이스
flutter run -d <device-id>
```

### 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 또는 dart-define 사용
flutter run \
  --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=xxx
```

### 빌드

#### Android

```bash
# APK 빌드
flutter build apk --release

# App Bundle 빌드 (Play Store용)
flutter build appbundle --release

# 결과물
# build/app/outputs/flutter-apk/app-release.apk
# build/app/outputs/bundle/release/app-release.aab
```

**서명 설정 (`android/key.properties`):**
```properties
storePassword=<password>
keyPassword=<password>
keyAlias=upload
storeFile=<path-to-keystore>
```

#### iOS

```bash
# Pod 설치
cd ios && pod install && cd ..

# 빌드
flutter build ios --release

# IPA 생성 (App Store용)
flutter build ipa --release

# 결과물
# build/ios/ipa/modu_repair.ipa
```

**Apple Developer 설정:**
- Provisioning Profile
- App Store Connect 앱 등록
- Xcode에서 서명 설정

### Firebase App Distribution (테스트 배포)

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# Android 배포
firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-release.apk \
  --app <FIREBASE_APP_ID> \
  --groups testers

# iOS 배포
firebase appdistribution:distribute \
  build/ios/ipa/modu_repair.ipa \
  --app <FIREBASE_APP_ID> \
  --groups testers
```

### App Store / Play Store 배포

#### Google Play Store

1. Play Console 접속
2. 앱 생성 및 세팅
3. App Bundle 업로드
4. 내부/공개 테스트 → 프로덕션

```bash
# Fastlane 사용 (자동화)
fastlane android deploy
```

#### Apple App Store

1. App Store Connect 접속
2. 앱 등록
3. Xcode로 Archive & Upload
4. TestFlight → 프로덕션

```bash
# Fastlane 사용 (자동화)
fastlane ios deploy
```

---

## 🌐 Admin Web (Next.js)

### 개발 환경

```bash
cd apps/admin

# 의존성 설치
npm install

# 환경변수 설정
cp ../../env.example .env.local

# 개발 서버
npm run dev
```

### 환경변수 (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 테스트
npm run start
```

### Vercel 배포

#### 자동 배포 (권장)

1. **GitHub 연동**
   - Vercel Dashboard에서 프로젝트 Import
   - GitHub 리포지토리 선택
   - `apps/admin` 경로 지정

2. **환경변수 설정**
   - Settings → Environment Variables
   - Production, Preview, Development 환경 설정

3. **자동 배포**
   - `main` 브랜치 푸시 → Production 배포
   - PR 생성 → Preview 배포

#### 수동 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포
cd apps/admin
vercel

# 프로덕션 배포
vercel --prod
```

### 커스텀 도메인

```bash
# Vercel Dashboard에서 설정
# Settings → Domains → Add Domain
# DNS 설정 (CNAME 또는 A 레코드)
```

---

## ⚡ Edge Functions (Supabase)

### 로컬 개발

```bash
cd apps/edge

# Supabase CLI 설치
npm install -g supabase

# 로컬 Supabase 시작
supabase start

# Edge Functions 실행
supabase functions serve

# 특정 함수만 실행
supabase functions serve shipments-book
```

### 환경변수 설정

```bash
# 로컬 환경변수
supabase secrets set PORTONE_API_KEY=xxx
supabase secrets set EPOST_API_KEY=xxx
supabase secrets set CLOUDFLARE_API_TOKEN=xxx

# 환경변수 확인
supabase secrets list
```

### 배포

```bash
# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# 모든 함수 배포
supabase functions deploy

# 특정 함수만 배포
supabase functions deploy shipments-book
supabase functions deploy payments-verify
supabase functions deploy videos-upload

# 배포 확인
supabase functions list
```

### 프로덕션 환경변수

```bash
# 프로덕션 환경변수 설정
supabase secrets set --project-ref your-project-ref \
  PORTONE_API_KEY=prod-key \
  EPOST_API_KEY=prod-key \
  CLOUDFLARE_API_TOKEN=prod-token
```

---

## 🗄️ Database (Supabase)

### 로컬 개발

```bash
cd apps/sql

# Supabase 로컬 시작
supabase start

# 스키마 적용
supabase db reset

# 또는 psql로 직접 실행
psql -h localhost -p 54322 -U postgres -d postgres -f schema/01_users.sql
```

### 마이그레이션

```bash
# 새 마이그레이션 생성
supabase migration new create_users_table

# 마이그레이션 파일 편집
# supabase/migrations/20240115120000_create_users_table.sql

# 로컬 적용
supabase db reset

# 프로덕션 푸시
supabase db push
```

### 배포

#### 방법 1: Supabase CLI

```bash
# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 푸시
supabase db push
```

#### 방법 2: Supabase Dashboard

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 스키마 파일 내용 복사 & 실행

### 백업 및 복원

```bash
# 백업
supabase db dump -f backup.sql

# 복원
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql

# 프로덕션 백업
supabase db dump --project-ref your-project-ref -f prod_backup.sql
```

---

## 🔄 CI/CD 파이프라인

### GitHub Actions 예시

#### Mobile (`.github/workflows/mobile.yml`)

```yaml
name: Flutter CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/mobile/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: cd apps/mobile && flutter pub get
      - run: cd apps/mobile && flutter test
      - run: cd apps/mobile && flutter build apk --release
      
      - name: Upload to Firebase App Distribution
        uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: ${{ secrets.FIREBASE_APP_ID }}
          serviceCredentialsFileContent: ${{ secrets.FIREBASE_CREDENTIALS }}
          file: apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

#### Admin (`.github/workflows/admin.yml`)

```yaml
name: Next.js CI

on:
  push:
    branches: [main]
    paths:
      - 'apps/admin/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd apps/admin && npm install
      - run: cd apps/admin && npm run build
      
      # Vercel은 자동 배포됨 (GitHub 연동 시)
```

#### Edge Functions (`.github/workflows/edge.yml`)

```yaml
name: Supabase Functions CI

on:
  push:
    branches: [main]
    paths:
      - 'apps/edge/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g supabase
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      - run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 🔐 비밀 관리

### GitHub Secrets

```
Settings → Secrets and variables → Actions → New repository secret
```

필요한 Secrets:
- `FIREBASE_APP_ID`
- `FIREBASE_CREDENTIALS`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `VERCEL_TOKEN`

### 환경변수 체크리스트

#### Mobile
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ FIREBASE_OPTIONS (google-services.json)

#### Admin
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ NEXT_PUBLIC_APP_URL

#### Edge Functions
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ PORTONE_API_KEY
- ✅ EPOST_API_KEY
- ✅ CLOUDFLARE_API_TOKEN

---

## 📊 모니터링

### Supabase Dashboard
- Database 사용량
- API 요청 통계
- Edge Functions 로그
- RLS 정책 확인

### Vercel Analytics
- 페이지 뷰
- Core Web Vitals
- 에러 추적

### Firebase Console
- Crashlytics (앱 크래시)
- Performance Monitoring
- Push 발송 통계

---

## 🐛 트러블슈팅

### 일반적인 문제

#### 1. Supabase 연결 실패
```bash
# .env 파일 확인
# Supabase Dashboard에서 URL/Key 재확인
```

#### 2. Flutter 빌드 실패
```bash
# 캐시 정리
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

#### 3. Next.js 빌드 에러
```bash
# node_modules 재설치
rm -rf node_modules
npm install
```

#### 4. Edge Functions 배포 실패
```bash
# Supabase CLI 업데이트
npm update -g supabase

# 재연결
supabase link --project-ref your-project-ref
```

---

## 📚 참고 자료

- [Flutter 배포 가이드](https://docs.flutter.dev/deployment)
- [Next.js Vercel 배포](https://vercel.com/docs)
- [Supabase CLI 문서](https://supabase.com/docs/reference/cli)
- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)

---

## 체크리스트

### 배포 전 확인사항

- [ ] 모든 환경변수 설정 완료
- [ ] Database 마이그레이션 적용
- [ ] Edge Functions 배포 테스트
- [ ] Mobile 앱 서명 설정
- [ ] Admin 빌드 성공 확인
- [ ] RLS 정책 확인
- [ ] 외부 API 키 유효성 확인
- [ ] 도메인/DNS 설정 완료

### 배포 후 확인사항

- [ ] 앱 로그인 테스트
- [ ] 주문 플로우 테스트
- [ ] 결제 테스트 (테스트 모드)
- [ ] 영상 업로드/재생 테스트
- [ ] 푸시 알림 테스트
- [ ] 에러 로그 확인
- [ ] 성능 모니터링 확인

