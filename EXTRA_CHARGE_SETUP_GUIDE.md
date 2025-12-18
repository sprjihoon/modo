# 엑스트라차지 추가결제 기능 설정 가이드

## 📋 개요

입고 및 작업 과정에서 추가 비용이 발생할 때 고객에게 결제를 요청하는 기능입니다.

### 워크플로우

1. **작업자**: 추가 비용 사유만 입력 → 관리자 승인 대기
2. **관리자/입출고관리자**: 금액 + 사유 입력 → 고객에게 직접 청구 (Direct Pass)
3. **고객**: 플러터 앱에서 결제 또는 거절

---

## 🚀 설정 단계

### 1. 데이터베이스 마이그레이션 실행

Supabase Dashboard의 SQL Editor에서 다음 파일을 실행하세요:

```
modo/apps/sql/migrations/add_extra_charge_workflow.sql
```

**실행 방법:**
1. Supabase Dashboard 접속
2. SQL Editor 메뉴 선택
3. 위 파일의 내용을 복사하여 붙여넣기
4. "Run" 버튼 클릭

**확인 명령어:**
```sql
-- extra_charge_status 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE 'extra%';

-- RPC 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%extra_charge%';
```

예상 결과:
- `extra_charge_status` (extra_charge_status)
- `extra_charge_data` (jsonb)
- `request_extra_charge` (function)
- `approve_extra_charge` (function)
- `process_customer_decision` (function)

---

## 📍 구현된 기능

### 1. 입고 페이지 (`/ops/inbound`)
- **위치**: 우측 상단 "추가 비용 요청" 버튼
- **작업자**: 사유만 입력 → 관리자 승인 대기
- **관리자**: 사유 + 금액 + 안내 메시지 입력 → 고객에게 직접 청구

### 2. 작업 페이지 (`/ops/work`)
- **위치**: 우측 상단 "추가 비용 요청" 버튼
- **작업자**: 사유만 입력 → 관리자 승인 대기
- **관리자**: 사유 + 금액 + 안내 메시지 입력 → 고객에게 직접 청구

### 3. 주문 상세 페이지 (`/dashboard/orders/[id]`)
- **위치**: 우측 상단 "추가 비용 검토" 버튼
- **관리자**: 작업자의 요청을 검토하고 금액 결정 후 승인

---

## 🔄 워크플로우 상세

### 시나리오 1: 작업자 → 관리자 → 고객

```
1. 작업자가 입고/작업 중 추가 비용 발견
   └─ [추가 비용 요청] 버튼 클릭 → 사유만 입력
   └─ 상태: NONE → PENDING_MANAGER
   └─ 주문 상태: PROCESSING → HOLD

2. 관리자가 주문 상세 화면에서 확인
   └─ [추가 비용 검토] 버튼 클릭
   └─ 작업자 메모 확인 → 금액 + 안내 메시지 입력 후 승인
   └─ 상태: PENDING_MANAGER → PENDING_CUSTOMER

3. 고객이 플러터 앱에서 결정
   └─ [결제하기]: 추가 금액 결제 후 작업 재개
   └─ [그냥 진행]: 추가 작업 없이 원안대로 진행
   └─ [반송하기]: 왕복 배송비 차감 후 반송
```

### 시나리오 2: 관리자 Direct Pass

```
1. 관리자가 입고/작업 중 추가 비용 발견
   └─ [추가 비용 요청] 버튼 클릭
   └─ 사유 + 금액 + 안내 메시지 모두 입력
   └─ 상태: NONE → PENDING_CUSTOMER (승인 단계 생략)
   └─ 주문 상태: PROCESSING → HOLD

2. 고객이 플러터 앱에서 즉시 결정
   └─ (시나리오 1의 3번과 동일)
```

---

## 🗄️ 데이터베이스 구조

### orders 테이블 추가 컬럼

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `extra_charge_status` | `extra_charge_status` | 추가 과금 상태 (기본값: NONE) |
| `extra_charge_data` | `jsonb` | 추가 과금 상세 정보 |

### extra_charge_status ENUM

- `NONE`: 초기 상태
- `PENDING_MANAGER`: 작업자 요청, 관리자 승인 대기
- `PENDING_CUSTOMER`: 고객 결제 대기
- `COMPLETED`: 고객 결제 완료
- `SKIPPED`: 고객 거절, 원안대로 진행
- `RETURN_REQUESTED`: 고객 반송 요청

### extra_charge_data 구조 (JSONB)

```json
{
  "workerMemo": "현장 상황 메모",
  "managerPrice": 10000,
  "managerNote": "고객 안내 문구",
  "requestedAt": "2025-12-18T10:00:00Z",
  "approvedAt": "2025-12-18T10:30:00Z",
  "completedAt": "2025-12-18T11:00:00Z",
  "requestedBy": "uuid-작업자",
  "approvedBy": "uuid-관리자",
  "customerAction": "PAY",
  "returnFee": 6000
}
```

---

## 🔒 권한 관리

### 역할별 권한

| 역할 | 요청 | 금액 입력 | 승인 | 결제 |
|------|------|-----------|------|------|
| WORKER | ✅ | ❌ | ❌ | ❌ |
| MANAGER | ✅ | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ❌ |
| CUSTOMER | ❌ | ❌ | ❌ | ✅ |

---

## 🧪 테스트 방법

### 1. 작업자 요청 테스트

1. 작업자 계정으로 로그인
2. `/ops/inbound` 또는 `/ops/work` 페이지 접속
3. 송장 조회 후 "추가 비용 요청" 버튼 클릭
4. 사유만 입력하고 "요청 보내기" 클릭
5. 확인: `extra_charge_status`가 `PENDING_MANAGER`로 변경

### 2. 관리자 승인 테스트

1. 관리자 계정으로 로그인
2. `/dashboard/orders/[주문ID]` 페이지 접속
3. "추가 비용 검토 (1)" 버튼 클릭
4. 금액과 안내 메시지 입력 후 "승인 및 청구" 클릭
5. 확인: `extra_charge_status`가 `PENDING_CUSTOMER`로 변경

### 3. 관리자 Direct Pass 테스트

1. 관리자 계정으로 로그인
2. `/ops/inbound` 또는 `/ops/work` 페이지 접속
3. "추가 비용 요청" 버튼 클릭
4. 사유 + 금액 + 안내 메시지 모두 입력
5. "고객에게 청구" 클릭
6. 확인: `extra_charge_status`가 `PENDING_CUSTOMER`로 즉시 변경

---

## 📝 구현 파일 목록

### API Routes
- `/api/ops/extra-charge/route.ts` - 추가 비용 요청
- `/api/orders/[id]/extra-charge/route.ts` - 관리자 승인/반려
- `/api/orders/[id]/extra-charges/route.ts` - 요청 목록 조회
- `/api/auth/me/route.ts` - 현재 사용자 정보 조회

### UI Components
- `/app/ops/inbound/page.tsx` - 입고 페이지 (추가 비용 요청 버튼 추가)
- `/app/ops/work/page.tsx` - 작업 페이지 (추가 비용 요청 버튼 추가)
- `/components/orders/extra-charge-review-dialog.tsx` - 관리자 검토 다이얼로그

### Database
- `/apps/sql/migrations/add_extra_charge_workflow.sql` - 마이그레이션 파일

---

## 🔧 트러블슈팅

### 문제: RPC 함수 호출 실패
```
Error: function request_extra_charge does not exist
```
**해결**: 마이그레이션 파일을 Supabase에서 실행하세요.

### 문제: 권한 오류
```
Error: 관리자 권한이 필요합니다
```
**해결**: 
```sql
UPDATE public.users 
SET role = 'MANAGER' 
WHERE email = 'your@email.com';
```

### 문제: 금액 입력 필드가 보이지 않음
**해결**: 
1. 브라우저 콘솔에서 사용자 role 확인
2. `/api/auth/me` API가 정상 작동하는지 확인
3. 로그아웃 후 다시 로그인

---

## ✅ 완료 확인

- [x] SQL 마이그레이션 작성
- [x] API Routes 구현
- [x] UI 컴포넌트 추가
- [x] 권한 검증 구현
- [ ] SQL 마이그레이션 실행 (배포 시)
- [ ] E2E 테스트 (배포 시)

---

## 📞 문의

구현 중 문제가 발생하면:
1. 브라우저 콘솔 로그 확인
2. Supabase Dashboard > Logs 확인
3. 이 가이드의 트러블슈팅 섹션 참고

**중요**: 실제 배포 전에 반드시 테스트 환경에서 전체 워크플로우를 검증하세요!

