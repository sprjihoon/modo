# 추가 과금(Extra Charge) 워크플로우 구현 완료 ✅

## 🎯 프로젝트 목표

'모두의 수선'의 핵심 수익화 모델인 **추가 과금(Extra Charge) 워크플로우** 구현

**핵심 기능**:
- 기본 워크플로우: [작업자 요청 → 관리자 승인 → 고객 결제]
- **Direct Pass**: 관리자가 직접 발견한 경우 즉시 고객에게 발송

---

## 📦 구현 완료 내역

### 1. 데이터베이스 스키마 ✅

**파일**: `apps/sql/migrations/add_extra_charge_workflow.sql`

**변경사항**:
- ✅ `extra_charge_status` ENUM 생성 (6개 상태)
  - `NONE`, `PENDING_MANAGER`, `PENDING_CUSTOMER`, `COMPLETED`, `SKIPPED`, `RETURN_REQUESTED`
- ✅ `orders` 테이블에 컬럼 추가:
  - `extra_charge_status` (ENUM)
  - `extra_charge_data` (JSONB)
- ✅ `order_status`에 상태 추가:
  - `HOLD` (작업 일시정지)
  - `RETURN_PENDING` (반송 대기)
- ✅ RPC 함수 3개 구현:
  - `request_extra_charge()`
  - `approve_extra_charge()`
  - `process_customer_decision()`

### 2. Dart 모델 및 Enum ✅

**파일**:
- `lib/core/enums/extra_charge_status.dart` - 추가 과금 상태
- `lib/core/enums/order_status.dart` - 주문 상태 (HOLD, RETURN_PENDING 추가)
- `lib/features/orders/domain/models/extra_charge_data.dart` - 상세 데이터 모델

**기능**:
- ✅ String ↔ Enum 변환
- ✅ 한글 표시명
- ✅ 상태별 헬퍼 메서드

### 3. 비즈니스 로직 (Service) ✅

**파일**: `lib/services/extra_charge_service.dart`

**구현 메서드**:
- ✅ `requestExtraWork()` - 스마트 요청 (역할 자동 분기)
- ✅ `approveWorkerRequest()` - 관리자 승인
- ✅ `processCustomerDecision()` - 고객 결정 처리
- ✅ `getPendingManagerOrders()` - 승인 대기 목록 조회
- ✅ `getMyPendingCustomerOrder()` - 내 결제 대기 주문 조회
- ✅ `getExtraChargeData()` - 추가 과금 정보 조회

### 4. 상태 관리 (Provider) ✅

**파일**: `lib/features/orders/providers/extra_charge_provider.dart`

**기능**:
- ✅ 로딩/에러 상태 관리
- ✅ 승인 대기 목록 캐싱
- ✅ 고객 결제 대기 주문 캐싱
- ✅ 자동 데이터 새로고침

### 5. UI 컴포넌트 ✅

#### A. 추가 작업 요청 다이얼로그
**파일**: `lib/features/orders/presentation/widgets/request_extra_work_dialog.dart`

**특징**:
- ✅ 역할 기반 UI 자동 변경:
  - **작업자**: 사유만 입력
  - **관리자**: 사유 + 금액 + 안내문구 입력
- ✅ 유효성 검증
- ✅ 로딩 상태 표시

#### B. 관리자 승인 대기 화면
**파일**: `lib/features/orders/presentation/pages/pending_extra_charges_page.dart`

**기능**:
- ✅ PENDING_MANAGER 상태 주문 목록 표시
- ✅ 작업자 메모 확인
- ✅ 승인/반려 액션 버튼
- ✅ Pull-to-refresh

#### C. 고객 결제 요청 카드
**파일**: `lib/features/orders/presentation/widgets/extra_charge_request_card.dart`

**기능**:
- ✅ PENDING_CUSTOMER 상태일 때만 표시
- ✅ 3가지 액션 버튼:
  - **결제하기**: 추가 금액 결제 후 작업 재개
  - **그냥 진행**: 추가 작업 없이 원안대로 진행
  - **반송하기**: 왕복 배송비 6,000원 차감 후 반송
- ✅ 확인 다이얼로그
- ✅ 금액 포맷팅 (1,000원 형식)

---

## 🔄 워크플로우 시나리오

### 시나리오 1: 작업자 → 관리자 → 고객 (표준)

```
1. 작업자가 현장에서 추가 작업 필요 발견
   └─ [추가 작업] 버튼 클릭 → 사유 입력
   └─ 상태: NONE → PENDING_MANAGER
   └─ 주문 상태: PROCESSING → HOLD

2. 관리자가 승인 대기 화면에서 확인
   └─ 작업자 메모 확인 → 금액/안내문구 입력 후 승인
   └─ 상태: PENDING_MANAGER → PENDING_CUSTOMER

3. 고객이 주문 상세 화면에서 결정
   └─ [결제하기]: 상태 COMPLETED, 주문 PROCESSING (작업 재개)
   └─ [그냥 진행]: 상태 SKIPPED, 주문 PROCESSING (원안대로)
   └─ [반송하기]: 상태 RETURN_REQUESTED, 주문 RETURN_PENDING
```

### 시나리오 2: 관리자 Direct Pass

```
1. 관리자가 직접 추가 작업 필요 발견
   └─ [추가 작업] 버튼 클릭 → 사유 + 금액 + 안내문구 입력
   └─ 상태: NONE → PENDING_CUSTOMER (승인 단계 생략)
   └─ 주문 상태: PROCESSING → HOLD

2. 고객이 주문 상세 화면에서 즉시 결정
   └─ (시나리오 1의 3번과 동일)
```

---

## 📁 파일 구조

```
modo/
├── apps/
│   ├── sql/
│   │   └── migrations/
│   │       └── add_extra_charge_workflow.sql  ← 🆕 DB 마이그레이션
│   └── mobile/
│       ├── lib/
│       │   ├── core/
│       │   │   └── enums/
│       │   │       ├── extra_charge_status.dart  ← 🆕 추가 과금 상태
│       │   │       └── order_status.dart         ← 🆕 주문 상태 (업데이트)
│       │   ├── features/
│       │   │   └── orders/
│       │   │       ├── domain/
│       │   │       │   └── models/
│       │   │       │       └── extra_charge_data.dart  ← 🆕 데이터 모델
│       │   │       ├── providers/
│       │   │       │   └── extra_charge_provider.dart  ← 🆕 상태 관리
│       │   │       └── presentation/
│       │   │           ├── pages/
│       │   │           │   └── pending_extra_charges_page.dart  ← 🆕 승인 대기 화면
│       │   │           └── widgets/
│       │   │               ├── request_extra_work_dialog.dart   ← 🆕 요청 다이얼로그
│       │   │               └── extra_charge_request_card.dart   ← 🆕 고객 카드
│       │   └── services/
│       │       └── extra_charge_service.dart  ← 🆕 비즈니스 로직
│       └── EXTRA_CHARGE_INTEGRATION_GUIDE.md  ← 🆕 통합 가이드
└── EXTRA_CHARGE_IMPLEMENTATION_SUMMARY.md  ← 🆕 이 문서
```

---

## 🚀 배포 체크리스트

### 1. 데이터베이스 마이그레이션

```bash
# Supabase Dashboard > SQL Editor에서 실행
apps/sql/migrations/add_extra_charge_workflow.sql
```

**확인 명령어**:
```sql
-- 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE 'extra%';

-- RPC 함수 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%extra_charge%';
```

### 2. Flutter 앱 통합

#### A. Provider 등록 (`main.dart`)

```dart
import 'features/orders/providers/extra_charge_provider.dart';

MultiProvider(
  providers: [
    // 기존 providers...
    ChangeNotifierProvider(create: (_) => ExtraChargeProvider()),
  ],
  child: MyApp(),
)
```

#### B. 라우팅 추가 (`app_router.dart`)

```dart
GoRoute(
  path: '/pending-extra-charges',
  builder: (context, state) => const PendingExtraChargesPage(),
),
```

#### C. 작업 화면에 버튼 추가

작업자/관리자가 접근하는 주문 상세 화면에 추가:

```dart
import 'features/orders/presentation/widgets/request_extra_work_dialog.dart';

FloatingActionButton(
  onPressed: () => showRequestExtraWorkDialog(
    context: context,
    orderId: orderId,
    onSuccess: _refresh,
  ),
  child: const Icon(Icons.add_circle),
)
```

#### D. 고객 주문 상세 화면에 카드 추가

`order_detail_page.dart`:

```dart
import 'features/orders/presentation/widgets/extra_charge_request_card.dart';

// body의 최상단에 배치
Column(
  children: [
    if (_orderData != null)
      ExtraChargeRequestCard(
        orderId: widget.orderId,
        orderData: _orderData!,
        onActionCompleted: _loadOrderData,
      ),
    // ... 기존 UI
  ],
)
```

#### E. 관리자 메뉴에 링크 추가

관리자 홈 화면 또는 드로어에 추가:

```dart
ListTile(
  leading: const Icon(Icons.pending_actions),
  title: const Text('추가 작업 승인 대기'),
  onTap: () => context.go('/pending-extra-charges'),
)
```

### 3. 의존성 확인

`pubspec.yaml`에 다음 패키지가 있는지 확인:

```yaml
dependencies:
  provider: ^6.0.0
  intl: ^0.18.0  # 금액 포맷팅용
  supabase_flutter: ^latest
```

---

## 🧪 테스트 가이드

### 테스트 1: 작업자 요청 → 관리자 승인 → 고객 결제

1. **작업자 계정**으로 로그인
2. 주문 상세 화면에서 **[추가 작업]** 버튼 클릭
3. 사유만 입력하고 요청
4. **관리자 계정**으로 로그인
5. **[추가 작업 승인 대기]** 메뉴 진입
6. 해당 주문 선택 → 금액/안내 입력 후 승인
7. **고객 계정**으로 로그인
8. 주문 상세 화면 확인 → 추가 결제 카드 표시
9. **[결제하기]** 클릭 → 완료 메시지 확인

### 테스트 2: 관리자 Direct Pass

1. **관리자 계정**으로 로그인
2. 주문 상세 화면에서 **[추가 작업]** 버튼 클릭
3. 사유 + 금액 + 안내문구 모두 입력
4. **고객 계정**으로 로그인
5. 주문 상세 화면에 즉시 추가 결제 카드 표시

### 테스트 3: 고객 거절 및 반송

1. 고객 결제 카드에서 **[그냥 진행]** 클릭 → 메시지 확인
2. 고객 결제 카드에서 **[반송하기]** 클릭 → 배송비 안내 확인

---

## 📊 데이터베이스 스키마 변경 요약

### orders 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `extra_charge_status` | `extra_charge_status` | 추가 과금 상태 (기본값: NONE) |
| `extra_charge_data` | `jsonb` | 추가 과금 상세 정보 |

### extra_charge_data 구조 (JSONB)

```json
{
  "workerMemo": "현장 상황 메모",
  "managerPrice": 10000,
  "managerNote": "고객 안내 문구",
  "requestedAt": "2025-12-10T10:00:00Z",
  "approvedAt": "2025-12-10T10:30:00Z",
  "completedAt": "2025-12-10T11:00:00Z",
  "requestedBy": "uuid-작업자",
  "approvedBy": "uuid-관리자",
  "customerAction": "PAY",
  "returnFee": 6000
}
```

---

## 🔒 보안 고려사항

### 1. RLS (Row Level Security)
- ✅ RPC 함수 내부에서 역할 검증
- ✅ 고객은 자신의 주문만 조회/처리 가능
- ✅ 관리자만 승인 가능

### 2. 권한 검증
- `request_extra_charge`: WORKER는 memo만, MANAGER/ADMIN은 전체 허용
- `approve_extra_charge`: MANAGER/ADMIN만 호출 가능
- `process_customer_decision`: 주문 소유자만 호출 가능

### 3. 입력 검증
- ✅ Dart에서 Form validation
- ✅ SQL에서 NOT NULL, CHECK 제약조건
- ✅ 금액은 양수만 허용

---

## 📈 향후 개선 사항

### 우선순위 High
- [ ] 실제 PG사 결제 연동 (현재는 버튼만 구현)
- [ ] 반려(Reject) 기능 구현
- [ ] 푸시 알림 (상태 변경 시)

### 우선순위 Medium
- [ ] 추가 과금 히스토리 페이지
- [ ] 통계 대시보드 (승인율, 평균 금액 등)
- [ ] 이메일/SMS 알림

### 우선순위 Low
- [ ] 반송 배송비 설정 UI (현재 6,000원 하드코딩)
- [ ] 다중 추가 과금 (한 주문에 여러 번)
- [ ] 첨부 파일 업로드 (추가 작업 증빙)

---

## 📞 트러블슈팅

### 문제: RPC 함수 호출 실패
```
Error: function request_extra_charge does not exist
```
**원인**: 마이그레이션 미실행  
**해결**: SQL 파일을 Supabase에서 실행

### 문제: Provider not found
```
Error: Could not find the correct Provider<ExtraChargeProvider>
```
**원인**: Provider 미등록  
**해결**: `main.dart`에 Provider 추가

### 문제: 권한 오류
```
Error: 관리자 권한이 필요합니다
```
**원인**: users.role이 올바르지 않음  
**해결**: 
```sql
UPDATE public.users 
SET role = 'MANAGER' 
WHERE email = 'your@email.com';
```

---

## ✅ 완료 확인

- [x] SQL 마이그레이션 작성
- [x] Dart Enum 및 모델 작성
- [x] Service 로직 구현
- [x] Provider 상태 관리 구현
- [x] UI 컴포넌트 3개 작성
- [x] 통합 가이드 문서 작성
- [x] 린터 오류 0개 확인
- [ ] SQL 마이그레이션 실행 (배포 시)
- [ ] Provider 등록 (배포 시)
- [ ] UI 통합 (배포 시)
- [ ] E2E 테스트 (배포 시)

---

## 📝 구현 파일 목록 (최종)

### SQL (1개)
1. `apps/sql/migrations/add_extra_charge_workflow.sql`

### Dart (8개)
1. `lib/core/enums/extra_charge_status.dart`
2. `lib/core/enums/order_status.dart`
3. `lib/features/orders/domain/models/extra_charge_data.dart`
4. `lib/services/extra_charge_service.dart`
5. `lib/features/orders/providers/extra_charge_provider.dart`
6. `lib/features/orders/presentation/widgets/request_extra_work_dialog.dart`
7. `lib/features/orders/presentation/widgets/extra_charge_request_card.dart`
8. `lib/features/orders/presentation/pages/pending_extra_charges_page.dart`

### 문서 (2개)
1. `apps/mobile/EXTRA_CHARGE_INTEGRATION_GUIDE.md`
2. `EXTRA_CHARGE_IMPLEMENTATION_SUMMARY.md` (이 문서)

**총 11개 파일 생성** ✅

---

## 🎉 구현 완료!

모든 핵심 기능이 구현되었습니다.  
**통합 가이드**(`EXTRA_CHARGE_INTEGRATION_GUIDE.md`)를 참고하여 배포하세요.

**중요**: 실제 배포 전에 반드시 테스트 환경에서 전체 워크플로우를 검증하세요!

