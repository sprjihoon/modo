# 우체국 수거예약 전체 검수 및 테스트 플랜

## 현재 상태 검수 결과 ✅

### ✅ 코드 배포 상태
- Edge Function `shipments-book` 배포 완료
- `getResInfo` API 호출 로직 추가됨
- testYn 파라미터 검증 로직 추가됨
- 핀 메모 입력 후 이동 문제 수정됨

### ✅ 환경 변수 설정 필요
다음 환경 변수들이 Supabase Edge Functions Secrets에 설정되어 있어야 함:

| 환경 변수 | 설명 | 필수 여부 |
|-----------|------|-----------|
| `EPOST_API_KEY` | 우체국 API 키 | ✅ 필수 |
| `EPOST_SECURITY_KEY` | 우체국 보안키 (SEED128) | ✅ 필수 |
| `EPOST_CUSTOMER_ID` | 우체국 고객번호 | ✅ 필수 |
| `EPOST_APPROVAL_NO` | 계약 승인번호 | 선택사항 |
| `EPOST_OFFICE_SER` | 공급지 코드 | 선택사항 |

## 테스트 플로우

### 단계 1: 환경 변수 확인
```bash
# Supabase Dashboard에서 확인
# Settings → Edge Functions → Secrets

# 필요한 환경 변수들:
# EPOST_API_KEY, EPOST_SECURITY_KEY, EPOST_CUSTOMER_ID
```

### 단계 2: Mock 모드 테스트 (안전)
```typescript
// Flutter 앱에서 testMode: true로 설정하여 테스트
testMode: true, // Mock 모드
```

**예상 로그:**
```
⚠️ 테스트 모드입니다. 실제 수거예약이 등록되지 않습니다.
✅ Mock 응답: { regiNo: "TEST123", ... }
```

### 단계 3: 실제 API 모드 테스트 (주의!)
```typescript
// Flutter 앱에서 testMode: false로 설정하여 실제 테스트
testMode: false, // 실제 API 호출
```

**예상 로그:**
```
✅ testYn=N으로 설정되었습니다. 하지만 실제 수거예약이 등록되려면 우체국과의 계약이 완료되어야 합니다.
🚀 실제 우체국 API 호출 시작
✅ 실제 API 응답: { regiNo: "6896770093592", ... }
🔍 수거예약 상태 확인 API 호출: { ... }
✅ 수거예약 상태 확인 결과: { treatStusCd: "00" 또는 "01" }
```

## 주요 검수 포인트

### 1. testYn 파라미터 검증 ✅
```typescript
// shipments-book/index.ts:411
console.log('🔍 개발 체크 - testYn 파라미터:', {
  test_mode,
  testYn: epostParams.testYn,
  expected: test_mode ? 'Y' : 'N',
  isCorrect: epostParams.testYn === (test_mode ? 'Y' : 'N'),
});
```

**정상 조건:**
- `test_mode: false` → `testYn: 'N'` → `isCorrect: true`

### 2. API 호출 모드 확인 ✅
```typescript
// shipments-book/index.ts:383-394
console.log('🔍 API 호출 모드 확인:', {
  test_mode,
  hasSecurityKey,
  hasApiKey,
  willUseMock: test_mode || !hasSecurityKey,
  testYn: epostParams.testYn,
  warning: test_mode ? '⚠️ 테스트 모드입니다...' : '✅ testYn=N으로 설정되었습니다...'
});
```

**실제 API 호출 조건:**
- `test_mode: false`
- `hasSecurityKey: true`
- `willUseMock: false`

### 3. getResInfo API 호출 검증 ✅
```typescript
// shipments-book/index.ts:494-510
if (epostParams.testYn === 'N' && epostResponse.resNo && epostResponse.resDate) {
  const resInfo = await getResInfo({
    custNo: epostParams.custNo,
    reqType: '1',
    orderNo: epostParams.orderNo,
    reqYmd,
  });
  console.log('✅ 수거예약 상태 확인 결과:', {
    reqNo: resInfo.reqNo,
    resNo: resInfo.resNo,
    regiNo: resInfo.regiNo,
    treatStusCd: resInfo.treatStusCd,
    // ...
  });
}
```

### 4. treatStusCd 값 해석
- `00`: 신청준비
- `01`: 소포신청 (실제 수거예약 등록됨) ✅
- `02`: 운송장출력
- `03`: 집하완료

## 테스트 시나리오

### 시나리오 1: Mock 모드 테스트 (권장)
1. Flutter 앱에서 `testMode: true`로 설정
2. 수거예약 시도
3. 로그에서 Mock 응답 확인
4. 실제 API 호출되지 않음 확인

### 시나리오 2: 실제 API 테스트 (주의!)
1. 환경 변수 설정 확인
2. Flutter 앱에서 `testMode: false`로 설정
3. 수거예약 시도
4. 로그에서 실제 API 응답 확인
5. `getResInfo` 결과에서 `treatStusCd` 값 확인
6. `treatStusCd`가 `00` 또는 `01`이면 성공

## 문제 해결 가이드

### 문제 1: testYn이 'Y'로 설정됨
```
🔍 개발 체크 - testYn 파라미터: { test_mode: true, testYn: "Y", isCorrect: true }
```
**해결:** Flutter 앱에서 `testMode: false`로 설정

### 문제 2: Mock 모드로 실행됨
```
⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용
```
**해결:** `EPOST_SECURITY_KEY` 환경 변수 설정

### 문제 3: getResInfo API 호출 실패
```
❌ 수거예약 상태 확인 API 호출 실패: { error: "...", message: "..." }
```
**해결:** 에러 메시지 확인, 파라미터 검증

### 문제 4: treatStusCd가 00/01이 아님
```
treatStusCd: "02"
```
**의미:** 운송장출력 상태 (수거예약 등록되었지만 처리 중)
**해결:** 우체국 고객센터에 문의

## 최종 검수 체크리스트

- [ ] 환경 변수 설정 확인 (EPOST_*)
- [ ] Mock 모드 테스트 성공
- [ ] 실제 API 모드에서 testYn='N' 확인
- [ ] 실제 API 호출 성공 (regiNo 발급)
- [ ] getResInfo API 호출 성공
- [ ] treatStusCd 값이 00 또는 01
- [ ] 우체국 고객센터에 송장번호로 확인

## 실행 명령어

```bash
# 환경 변수 확인 (Supabase Dashboard에서 확인)
# Settings → Edge Functions → Secrets

# 코드 재배포 (필요시)
cd /Users/jangjihoon/modo
supabase functions deploy shipments-book

# Flutter 앱 테스트
# 결제 페이지에서 testMode 설정하여 테스트
```
