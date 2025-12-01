# 🔍 모두의수선 개발 환경 체크리스트

## ✅ 현재 설치된 항목

- [x] **Homebrew** - 패키지 관리자
- [x] **Node.js** v25.2.1 - 백엔드/프론트엔드 개발
- [x] **npm** v11.6.2 - Node.js 패키지 관리자
- [x] **Flutter** v3.38.3 - 모바일 앱 개발
- [x] **Dart** v3.10.1 - Flutter 언어
- [x] **Chrome** - 웹 브라우저 (Flutter 웹 실행용)

## ❌ 아직 설치되지 않은 항목

### 필수 도구
- [ ] **Supabase CLI** - 데이터베이스 및 Edge Functions 관리
- [ ] **Deno** - Supabase Edge Functions 실행 환경

### 환경변수 설정
- [ ] **루트 .env** - 프로젝트 전체 환경변수
- [ ] **apps/admin/.env.local** - 관리자 웹 환경변수 (Supabase 키 필요)
- [ ] **apps/mobile/.env** - 모바일 앱 환경변수 (기본값만 있음, 실제 값 필요)

### 외부 서비스 계정 및 설정
- [ ] **Supabase 프로젝트** - 데이터베이스, 인증, 스토리지
  - [ ] 프로젝트 생성
  - [ ] 데이터베이스 스키마 설정 (`apps/sql/` 마이그레이션 실행)
  - [ ] RLS (Row Level Security) 정책 설정
  - [ ] API 키 확인 (URL, ANON_KEY, SERVICE_ROLE_KEY)
  
- [ ] **Cloudflare Stream** - 영상 저장 및 스트리밍
  - [ ] 계정 생성
  - [ ] API 토큰 발급
  - [ ] Account ID 확인

- [ ] **PortOne (아임포트)** - 결제 서비스
  - [ ] 계정 생성
  - [ ] API 키 발급
  - [ ] IMP 코드 확인

- [ ] **우체국 API** - 수거예약 및 배송추적
  - [ ] 계약 및 승인
  - [ ] 고객번호 발급
  - [ ] API 키 및 보안키 발급

- [ ] **Firebase Cloud Messaging** - 푸시 알림 (선택사항)
  - [ ] Firebase 프로젝트 생성
  - [ ] FCM 서버 키 발급

## 📋 설치 및 설정 가이드

### 1. Supabase CLI 설치

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
brew install supabase/tap/supabase
```

설치 확인:
```bash
supabase --version
```

### 2. Deno 설치

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
brew install deno
```

설치 확인:
```bash
deno --version
```

### 3. Supabase 프로젝트 설정

#### 3.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. 프로젝트 URL 및 API 키 확인

#### 3.2 데이터베이스 스키마 설정
```bash
cd /Users/jangjihoon/modo/apps/sql
# Supabase Dashboard의 SQL Editor에서 실행하거나
# Supabase CLI로 마이그레이션 실행
```

#### 3.3 환경변수 설정
각 앱의 `.env` 파일에 Supabase 정보 입력

### 4. 환경변수 파일 생성

#### 4.1 Admin 웹 (.env.local)
```bash
cd /Users/jangjihoon/modo/apps/admin
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

#### 4.2 Mobile 앱 (.env)
```bash
cd /Users/jangjihoon/modo/apps/mobile
# .env 파일이 이미 있지만 실제 Supabase 값으로 업데이트 필요
```

### 5. Edge Functions 환경변수 설정

Supabase Dashboard → Settings → Edge Functions → Secrets에서 설정:
- `EPOST_CUSTOMER_ID`
- `EPOST_API_KEY`
- `EPOST_SECURITY_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `PORTONE_API_KEY`
- `PORTONE_API_SECRET`

## 🚀 빠른 시작 (최소 설정)

### 최소한으로 앱 실행하기

1. **Supabase CLI 및 Deno 설치**
   ```bash
   brew install supabase/tap/supabase deno
   ```

2. **Supabase 프로젝트 생성** (무료 플랜 가능)
   - https://supabase.com 에서 프로젝트 생성
   - API 키 복사

3. **Admin 웹 환경변수 설정**
   ```bash
   cd /Users/jangjihoon/modo/apps/admin
   # .env.local 파일 생성 및 Supabase 키 입력
   ```

4. **Admin 웹 실행**
   ```bash
   npm run dev
   # http://localhost:3000 접속
   ```

5. **데이터베이스 스키마 설정** (선택사항)
   - Supabase Dashboard → SQL Editor
   - `apps/sql/setup_all_tables.sql` 실행

## 📊 우선순위

### 높은 우선순위 (즉시 필요)
1. ✅ Supabase CLI 설치
2. ✅ Deno 설치
3. ✅ Supabase 프로젝트 생성
4. ✅ Admin 웹 .env.local 설정

### 중간 우선순위 (기능 개발 시 필요)
5. 데이터베이스 스키마 설정
6. Cloudflare Stream 설정 (영상 기능)
7. PortOne 설정 (결제 기능)

### 낮은 우선순위 (나중에 설정 가능)
8. 우체국 API 설정 (배송 기능)
9. Firebase FCM 설정 (푸시 알림)

## 🔗 참고 문서

- [Supabase 시작하기](https://supabase.com/docs/guides/getting-started)
- [Supabase CLI 문서](https://supabase.com/docs/reference/cli/introduction)
- [Deno 문서](https://deno.land/manual)
- [Cloudflare Stream 문서](https://developers.cloudflare.com/stream/)
- [PortOne 문서](https://developers.portone.io/)

## ⚠️ 주의사항

1. **환경변수 파일은 절대 Git에 커밋하지 마세요**
2. **Service Role Key는 서버 사이드에서만 사용하세요**
3. **API 키는 공개 저장소에 업로드하지 마세요**

