# 🚀 모두의수선 개발 환경 설정 가이드

## ✅ 현재 완료된 항목

- [x] Homebrew 설치
- [x] Node.js v25.2.1 설치
- [x] Flutter v3.38.3 설치
- [x] Supabase CLI 설치
- [x] Deno 설치
- [x] 기본 디렉토리 및 파일 생성

## 📋 다음 단계

### 1. Supabase 프로젝트 생성 및 설정

#### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `modu-repair` (또는 원하는 이름)
   - Database Password: 안전한 비밀번호 설정
   - Region: 가장 가까운 지역 선택
4. 프로젝트 생성 완료 대기 (약 2분)

#### 1.2 API 키 확인
1. Supabase Dashboard → Settings → API
2. 다음 값들을 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJhbGci...`
   - **service_role** key: `eyJhbGci...` (⚠️ 비밀!)

#### 1.3 환경변수 설정

**Admin 웹 (.env.local)**
```bash
cd /Users/jangjihoon/modo/apps/admin
# .env.local 파일 편집
# 위에서 복사한 Supabase 값으로 교체
```

**Mobile 앱 (.env)**
```bash
cd /Users/jangjihoon/modo/apps/mobile
# .env 파일 편집
# SUPABASE_URL과 SUPABASE_ANON_KEY 업데이트
```

### 2. 데이터베이스 스키마 설정

#### 방법 1: Supabase Dashboard 사용 (권장)
1. Supabase Dashboard → SQL Editor
2. `apps/sql/setup_all_tables.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. "Run" 클릭

#### 방법 2: Supabase CLI 사용
```bash
cd /Users/jangjihoon/modo/apps/edge
supabase link --project-ref your-project-ref
supabase db push
```

### 3. 외부 서비스 설정 (선택사항)

#### Cloudflare Stream (영상 기능)
1. https://dash.cloudflare.com 접속
2. Stream 서비스 활성화
3. API 토큰 생성:
   - Account ID 확인
   - API Token 생성
4. 환경변수에 추가:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

#### PortOne (결제 기능)
1. https://admin.portone.io 접속
2. 계정 생성 및 상점 등록
3. API 키 발급:
   - API Key
   - API Secret
   - IMP Code
4. 환경변수에 추가:
   - `PORTONE_API_KEY`
   - `PORTONE_API_SECRET`
   - `PORTONE_IMP_CODE`

#### 우체국 API (배송 기능)
1. 우체국 API 계약 (별도 신청 필요)
2. 계약 완료 후 발급:
   - 고객번호 (Customer ID)
   - API Key
   - Security Key
3. Supabase Edge Functions Secrets에 추가:
   - Dashboard → Settings → Edge Functions → Secrets

### 4. 앱 실행 확인

#### Admin 웹
```bash
cd /Users/jangjihoon/modo/apps/admin
npm run dev
# http://localhost:3000 접속
```

#### Mobile 앱
```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter run -d chrome
# Chrome 브라우저에서 자동 실행
```

## 🔍 환경 확인

### 설치된 도구 확인
```bash
# Node.js
node --version  # v25.2.1

# npm
npm --version  # 11.6.2

# Flutter
flutter --version  # 3.38.3

# Supabase CLI
supabase --version  # 2.62.10

# Deno
deno --version  # 2.5.6
```

### 환경변수 확인
```bash
# Admin 웹
cat /Users/jangjihoon/modo/apps/admin/.env.local

# Mobile 앱
cat /Users/jangjihoon/modo/apps/mobile/.env
```

## ⚠️ 주의사항

1. **환경변수 파일은 Git에 커밋하지 마세요**
   - `.env`, `.env.local` 파일은 `.gitignore`에 포함됨
   - 실제 API 키는 공개 저장소에 업로드하지 마세요

2. **Service Role Key 보안**
   - 절대 클라이언트 코드에 노출하지 마세요
   - 서버 사이드에서만 사용하세요

3. **Supabase 무료 플랜 제한**
   - 프로젝트당 500MB 데이터베이스
   - 2GB 파일 스토리지
   - 50,000 월간 활성 사용자

## 📚 참고 문서

- [개발 환경 체크리스트](./DEVELOPMENT_ENV_CHECKLIST.md)
- [Supabase 시작하기](https://supabase.com/docs/guides/getting-started)
- [Admin 환경변수 설정](./apps/admin/ADMIN_ENV_SETUP.md)
- [Mobile 환경변수 설정](./apps/mobile/ENV_SETUP_GUIDE.md)
- [우체국 API 설정](./apps/edge/EPOST_API_SETUP.md)

## 🆘 문제 해결

### Admin 웹이 실행되지 않을 때
1. `.env.local` 파일이 있는지 확인
2. Supabase URL과 키가 올바른지 확인
3. `npm install` 다시 실행

### Mobile 앱이 실행되지 않을 때
1. `.env` 파일이 있는지 확인
2. `flutter pub get` 실행
3. `flutter clean` 후 다시 실행

### 데이터베이스 연결 오류
1. Supabase 프로젝트가 활성화되어 있는지 확인
2. API 키가 올바른지 확인
3. 네트워크 연결 확인

## 🎯 다음 단계

환경 설정이 완료되면:
1. Admin 웹에서 로그인 테스트
2. Mobile 앱에서 회원가입 테스트
3. 데이터베이스에 테스트 데이터 추가
4. 기능별 개발 시작

