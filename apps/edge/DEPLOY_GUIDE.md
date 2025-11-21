# Edge Functions 배포 가이드

## 📦 Supabase Edge Functions 배포

### 1. Supabase CLI 설치 확인

```bash
supabase --version
```

설치 안 되어 있다면:
```bash
npm install -g supabase
# 또는
brew install supabase/tap/supabase
```

### 2. Supabase 로그인

```bash
supabase login
```

### 3. 프로젝트 연결

```bash
cd apps/edge
supabase link --project-ref YOUR_PROJECT_REF
```

**Project Ref 찾기:**
- Supabase Dashboard → Settings → General
- Project URL: `https://YOUR_PROJECT_REF.supabase.co`

### 4. 환경 변수 설정

**Supabase Dashboard에서:**
1. Settings → Edge Functions → Secrets
2. 다음 환경 변수 추가:

```bash
# 토스페이먼츠
TOSS_SECRET_KEY=your_toss_secret_key
TOSS_CLIENT_KEY=your_toss_client_key

# PortOne (아임포트) - 선택사항
PORTONE_API_KEY=your_portone_api_key
PORTONE_API_SECRET=your_portone_api_secret

# 우체국 API
EPOST_CUSTOMER_ID=vovok1122
EPOST_SECURITY_KEY=your_epost_security_key
EPOST_APPROVAL_NO=your_approval_number
EPOST_OFFICE_SER=251132110

# Supabase (자동 설정됨)
SUPABASE_URL=auto
SUPABASE_SERVICE_ROLE_KEY=auto
```

### 5. Edge Functions 배포

#### 전체 배포
```bash
cd apps/edge
supabase functions deploy
```

#### 개별 배포
```bash
# 토스페이먼츠 빌링키 발급
supabase functions deploy payments-issue-billing-key

# 토스페이먼츠 빌링키 결제
supabase functions deploy payments-billing-payment

# 결제 검증
supabase functions deploy payments-verify

# 결제 취소
supabase functions deploy payments-cancel

# 수거예약
supabase functions deploy shipments-book
```

## 🧪 테스트하기

### 로컬에서 테스트 (선택사항)

```bash
# 로컬 Supabase 시작
supabase start

# Edge Function 로컬 실행
supabase functions serve

# 특정 함수만 실행
supabase functions serve payments-billing-payment
```

### 배포된 함수 테스트

```bash
# cURL로 테스트
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/payments-verify \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "imp_uid": "test_imp_123",
    "merchant_uid": "test_merchant_123",
    "order_id": "test_order_123"
  }'
```

## 📊 배포 상태 확인

```bash
# 배포된 함수 목록
supabase functions list

# 함수 로그 확인
supabase functions logs payments-billing-payment
```

## 🔑 API 키 발급 방법

### 1. 토스페이먼츠
1. https://developers.tosspayments.com 접속
2. 회원가입 후 로그인
3. API 키 발급 (테스트/운영 키 별도)

### 2. PortOne (아임포트) - 선택사항
1. https://portone.io 접속
2. 회원가입 후 로그인
3. REST API 키 발급

### 3. 우체국 API
1. 우체국 택배 고객센터 문의: 1588-1300
2. 사업자 등록증 제출
3. API 계약 체결 및 보안키 발급

## ⚠️ 주의사항

### 결제 검증 Mock 모드

현재 `payments-verify`는 **Mock 모드**로 작동합니다:
- 항상 결제 검증 성공
- 실제 PortOne API 호출 안 함

**운영 환경에서는:**
1. `payments-verify/index.ts` 수정
2. Line 69-70 주석 해제 (실제 API 호출)
3. Mock 부분 제거

### 우체국 API Mock/실제 모드

```typescript
// test_mode: true → Mock 응답 사용
// test_mode: false → 실제 우체국 API 호출

{
  "order_id": "...",
  "customer_name": "홍길동",
  "test_mode": true  // 개발 중에는 true
}
```

## 🎯 배포 체크리스트

- [ ] Supabase CLI 설치
- [ ] Supabase 로그인
- [ ] 프로젝트 연결
- [ ] 환경 변수 설정 (토스페이먼츠 키)
- [ ] Edge Functions 배포
- [ ] 로그 확인
- [ ] Flutter 앱에서 테스트

## 🔗 유용한 링크

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [토스페이먼츠 개발자 문서](https://docs.tosspayments.com/)
- [PortOne 개발자 문서](https://developers.portone.io/)

