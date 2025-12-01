# 🔧 환경변수 완전 설정 가이드

## ✅ 현재 설정 완료된 항목

### 기본 설정
- [x] **Mobile 앱** (`apps/mobile/.env`) - Supabase 설정 완료
- [x] **Admin 웹** (`apps/admin/.env.local`) - Supabase 설정 완료

## 📋 추가로 설정해야 할 항목

### 1. Cloudflare Stream (영상 기능) ✅ 개발 완료

**Admin 웹 환경변수** (`apps/admin/.env.local`에 추가):
```env
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=your-subdomain
```

**Supabase Edge Functions Secrets** (Supabase Dashboard에서 설정):
- Settings → Edge Functions → Secrets
```bash
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=your-subdomain
```

**설정 방법:**
1. https://dash.cloudflare.com 접속
2. Stream 서비스 활성화
3. API 토큰 생성:
   - Account ID 확인 (대시보드 우측 상단)
   - API Tokens → Create Token
   - Stream 권한 부여
4. Stream Customer Subdomain 확인 (Stream 대시보드에서)

### 2. 우체국 API (배송 기능) ✅ 개발 완료

**Supabase Edge Functions Secrets** (Supabase Dashboard에서 설정):
- Settings → Edge Functions → Secrets
```bash
EPOST_CUSTOMER_ID=vovok1122          # 고객번호 (계약 시 발급)
EPOST_API_KEY=your_api_key           # API 인증키
EPOST_SECURITY_KEY=your_security_key # 보안키 (SEED128 암호화용)
EPOST_APPROVAL_NO=your_approval_no   # 계약 승인번호 (선택사항)
EPOST_OFFICE_SER=251132110           # 공급지 코드 (기본값)
```

**설정 방법:**
1. 우체국 계약소포 OpenAPI 계약 (http://ship.epost.go.kr)
2. 계약 완료 후 발급받은 정보:
   - 고객번호 (Customer ID)
   - API 인증키
   - 보안키 (SEED128 암호화용)
   - 승인번호 (선택사항)

**참고:** 
- 환경변수가 없으면 자동으로 Mock 모드로 전환됩니다
- 실제 API 호출 시 `test_mode: false`로 호출해야 합니다

### 3. PortOne (결제 기능) - 선택사항

**Mobile 앱** (`apps/mobile/.env`에 추가):
```env
PORTONE_API_KEY=your-portone-api-key
PORTONE_IMP_CODE=imp12345678
```

**설정 방법:**
1. https://admin.portone.io 접속
2. 계정 생성 및 상점 등록
3. API 키 발급

## 📝 환경변수 설정 위치 요약

### Admin 웹 (`apps/admin/.env.local`)
```env
# Supabase (✅ 완료)
NEXT_PUBLIC_SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Cloudflare Stream (⏳ 추가 필요)
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=your-subdomain

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Mobile 앱 (`apps/mobile/.env`)
```env
# Supabase (✅ 완료)
SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# PortOne (⏳ 선택사항)
PORTONE_API_KEY=your-portone-api-key
PORTONE_IMP_CODE=imp12345678
```

### Supabase Edge Functions Secrets
**Supabase Dashboard → Settings → Edge Functions → Secrets**

```bash
# Cloudflare Stream
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=your-subdomain

# 우체국 API
EPOST_CUSTOMER_ID=vovok1122
EPOST_API_KEY=your_api_key
EPOST_SECURITY_KEY=your_security_key
EPOST_APPROVAL_NO=your_approval_no  # 선택사항
EPOST_OFFICE_SER=251132110           # 기본값
```

## 🎯 우선순위

### 높은 우선순위 (기능 사용 시 필요)
1. ✅ Supabase 설정 - 완료
2. ⏳ Cloudflare Stream - 영상 업로드 기능 사용 시 필요
3. ⏳ 우체국 API - 수거예약/배송 추적 기능 사용 시 필요

### 낮은 우선순위 (선택사항)
4. ⏳ PortOne - 결제 기능 사용 시 필요

## 🔍 확인 방법

### Cloudflare Stream 설정 확인
```bash
# Admin 웹에서 영상 업로드 테스트
# Supabase Edge Functions 로그 확인
supabase functions logs videos-upload
```

### 우체국 API 설정 확인
```bash
# Edge Functions 로그 확인
supabase functions logs shipments-book
# 또는
supabase functions logs shipments-track
```

## 📚 참고 문서

- [Cloudflare Stream 구현](./apps/admin/lib/cloudflareStreamUpload.ts)
- [우체국 API 구현](./apps/edge/supabase/functions/_shared/epost/)
- [우체국 API 설정 가이드](./apps/edge/EPOST_API_SETUP.md)
- [Edge Functions README](./apps/edge/README.md)

## ⚠️ 주의사항

1. **환경변수 파일은 Git에 커밋하지 마세요**
   - `.env`, `.env.local` 파일은 `.gitignore`에 포함됨

2. **Supabase Edge Functions Secrets는 Dashboard에서만 설정**
   - 로컬 `.env` 파일이 아닌 Supabase Dashboard에서 설정해야 함

3. **API 키 보안**
   - 절대 공개 저장소에 업로드하지 마세요
   - Service Role Key는 서버 사이드에서만 사용

