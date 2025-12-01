# 📮 우체국 API 호출 흐름 분석

## 수거신청 (shipments-book) API 호출 순서

### 1. 계약 승인번호 조회 (`getApprovalNumber`) - **선택사항**

**호출 위치:** `shipments-book/index.ts` (252-262줄)

**호출 조건:**
- 환경변수 `EPOST_APPROVAL_NO`가 없을 때만 호출
- 있으면 환경변수 값 사용

**실패 시 처리:**
- API 호출 실패 시 기본값 `'0000000000'` 사용
- **수거예약은 계속 진행됨** (필수 아님)

**코드:**
```typescript
let apprNo = Deno.env.get('EPOST_APPROVAL_NO');
if (!apprNo) {
  try {
    apprNo = await getApprovalNumber(custNo);
    console.log('✅ 계약 승인번호 조회 성공:', apprNo);
  } catch (e) {
    console.error('❌ 계약 승인번호 조회 실패:', e);
    // 승인번호를 못 가져오면 Mock 사용
    apprNo = '0000000000';
  }
}
```

**결론:** ✅ **선택사항** - 없어도 수거예약 가능

---

### 2. 소포신청 (`insertOrder`) - **필수**

**호출 위치:** `shipments-book/index.ts` (333-366줄)

**호출 조건:**
- `test_mode: false` AND `EPOST_SECURITY_KEY` 환경변수가 있을 때만 실제 API 호출
- 그 외에는 Mock 사용

**실패 시 처리:**
- API 호출 실패 시 전체 수거예약 실패
- 에러 응답 반환

**코드:**
```typescript
if (test_mode || !hasSecurityKey) {
  console.log('⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용');
  epostResponse = await mockInsertOrder(epostParams);
} else {
  console.log('🚀 실제 우체국 API 호출 시작');
  epostResponse = await insertOrder(epostParams);
}
```

**결론:** ✅ **필수** - 실제 수거예약을 위해서는 반드시 성공해야 함

---

## 실제 수거예약을 위한 필수 조건

### ✅ 필수 환경변수 (Supabase Edge Functions Secrets)

1. **EPOST_CUSTOMER_ID** - 고객번호 (계약 시 발급)
   - 없으면: 에러 반환 (500)
   - 코드: 231-235줄

2. **EPOST_SECURITY_KEY** - 보안키 (SEED128 암호화용)
   - 없으면: Mock 모드로 전환 (실제 API 호출 안 함)
   - 코드: 336줄

3. **EPOST_API_KEY** - API 인증키
   - 없으면: Mock 모드로 전환
   - 코드: 337줄

### ⏳ 선택사항 환경변수

4. **EPOST_APPROVAL_NO** - 계약 승인번호
   - 없으면: `getApprovalNumber` API 호출 시도
   - 실패해도: 기본값 `'0000000000'` 사용하여 계속 진행
   - 코드: 252-262줄

5. **EPOST_OFFICE_SER** - 공급지 코드
   - 없으면: 기본값 `'251132110'` 사용
   - 코드: 271줄

---

## 수거신청 API 호출 흐름도

```
수거신청 요청
    ↓
[1] EPOST_CUSTOMER_ID 확인
    ├─ 없음 → ❌ 에러 반환 (500)
    └─ 있음 → 계속
    ↓
[2] EPOST_APPROVAL_NO 확인
    ├─ 있음 → 사용
    └─ 없음 → getApprovalNumber() 호출
        ├─ 성공 → 사용
        └─ 실패 → '0000000000' 사용 (계속 진행)
    ↓
[3] 소포신청 파라미터 구성
    ↓
[4] EPOST_SECURITY_KEY 확인
    ├─ 없음 → Mock 모드 (테스트)
    └─ 있음 → 실제 API 호출
        ├─ EPOST_API_KEY 확인
        │   ├─ 없음 → Mock 모드
        │   └─ 있음 → insertOrder() 호출
        │       ├─ 성공 → ✅ 수거예약 완료
        │       └─ 실패 → ❌ 에러 반환
```

---

## 정상 접수를 위한 최소 요구사항

### 실제 우체국 API로 수거예약하려면:

**필수:**
1. ✅ `EPOST_CUSTOMER_ID` - 고객번호
2. ✅ `EPOST_SECURITY_KEY` - 보안키
3. ✅ `EPOST_API_KEY` - API 인증키

**선택사항 (없어도 작동):**
- `EPOST_APPROVAL_NO` - 승인번호 (없으면 자동 조회 시도)
- `EPOST_OFFICE_SER` - 공급지 코드 (없으면 기본값 사용)

---

## 테스트 모드 vs 실제 모드

### 테스트 모드 (`test_mode: true` 또는 환경변수 없음)
- Mock 응답 사용
- 실제 우체국 API 호출 안 함
- 수거예약은 생성되지 않음
- 개발/테스트용

### 실제 모드 (`test_mode: false` + 필수 환경변수 있음)
- 실제 우체국 API 호출
- 실제 수거예약 생성
- **주의: 실제 수거예약이 생성됩니다!**

---

## 다른 우체국 API들

### 배송 추적 (`shipments-track`)
- **API:** `getResInfo` - 소포신청 확인
- **용도:** 배송 상태 조회
- **필수 여부:** 선택사항 (실패해도 Mock 데이터 사용)

### 취소 (`shipments-cancel`)
- **API:** `cancelOrder` - 소포신청 취소
- **용도:** 수거예약 취소
- **필수 여부:** 필수 (취소하려면 반드시 성공해야 함)

### 출고 (`shipments-create-outbound`)
- **API:** 
  - `getApprovalNumber` - 승인번호 조회 (선택사항)
  - `getDeliveryCode` - 배송지 코드 조회 (선택사항)
  - `insertOrder` - 출고 송장 발급 (필수)
- **용도:** 출고 시 발송 송장번호 발급
- **필수 여부:** `insertOrder`만 필수

---

## 요약

### 수거신청 정상 접수를 위한 필수 API

**1개만 필수:**
- ✅ `insertOrder` - 소포신청 (실제 수거예약 생성)

**선택사항:**
- ⏳ `getApprovalNumber` - 승인번호 조회 (없어도 기본값 사용)

### 필수 환경변수

**3개 필수:**
1. `EPOST_CUSTOMER_ID`
2. `EPOST_SECURITY_KEY`
3. `EPOST_API_KEY`

**2개 선택사항:**
- `EPOST_APPROVAL_NO` (없으면 자동 조회)
- `EPOST_OFFICE_SER` (없으면 기본값)

---

## 확인 방법

### Edge Functions 로그 확인
```bash
supabase functions logs shipments-book --follow
```

### 로그에서 확인할 내용
- `🚀 실제 우체국 API 호출 시작` - 실제 API 호출됨
- `⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용` - Mock 모드
- `✅ 실제 API 응답:` - 성공
- `❌ 우체국 API 호출 실패:` - 실패

