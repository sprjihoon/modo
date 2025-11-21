# 우체국 API 환경 변수 설정 가이드

## 📋 필수 환경 변수

Supabase Dashboard → Settings → Edge Functions → Secrets에서 다음 환경 변수를 설정해야 합니다:

### 1. 기본 설정
```bash
EPOST_CUSTOMER_ID=vovok1122          # 고객번호 (계약 시 발급)
EPOST_API_KEY=your_api_key           # API 인증키
EPOST_SECURITY_KEY=your_security_key # 보안키 (SEED128 암호화용)
EPOST_APPROVAL_NO=your_approval_no   # 계약 승인번호 (선택사항, 자동 조회 가능)
EPOST_OFFICE_SER=251132110           # 공급지 코드 (기본값)
```

### 2. 환경 변수 설정 방법

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **Edge Functions Secrets 설정**
   - Settings → Edge Functions → Secrets
   - 각 환경 변수를 추가

3. **변수 확인**
   ```bash
   # Edge Function 로그에서 확인 가능
   supabase functions logs shipments-book
   ```

### 3. 실제 API 호출 조건

- `test_mode: false`로 호출
- `EPOST_SECURITY_KEY` 환경 변수가 설정되어 있어야 함
- `EPOST_API_KEY` 환경 변수가 설정되어 있어야 함
- `EPOST_CUSTOMER_ID` 환경 변수가 설정되어 있어야 함

### 4. 테스트 모드 vs 실제 모드

**테스트 모드 (`test_mode: true`):**
- Mock 응답 사용
- 실제 우체국 API 호출 안 함
- 개발/테스트용

**실제 모드 (`test_mode: false`):**
- 실제 우체국 API 호출
- 실제 수거예약 생성
- **주의: 실제 수거예약이 생성됩니다!**

## 🔍 API 호출 확인

Edge Function 로그에서 확인:
```bash
supabase functions logs shipments-book --follow
```

로그에서 확인할 내용:
- `🚀 실제 우체국 API 호출` 메시지
- API 파라미터
- 실제 API 응답
- 에러 메시지 (있는 경우)

## ⚠️ 주의사항

1. **실제 API 호출 시 실제 수거예약이 생성됩니다**
2. **환경 변수가 없으면 자동으로 Mock 모드로 전환됩니다**
3. **API 키와 보안키는 절대 공개하지 마세요**

