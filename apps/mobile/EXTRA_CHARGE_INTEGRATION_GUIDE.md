# 추가 과금(Extra Charge) 워크플로우 통합 가이드

## 📋 개요

'모두의 수선' 핵심 수익화 모델인 **추가 과금(Extra Charge) 워크플로우**의 통합 가이드입니다.

**워크플로우**: [작업자 요청 → 관리자 승인 → 고객 결제] + **Direct Pass** (관리자 직접 발송)

---

## 🗂️ 구현된 파일 목록

### 1. 데이터베이스 (SQL)
```
apps/sql/migrations/add_extra_charge_workflow.sql
```
- `extra_charge_status` ENUM 생성
- `orders` 테이블에 `extra_charge_status`, `extra_charge_data` 컬럼 추가
- `order_status`에 `HOLD`, `RETURN_PENDING` 상태 추가
- 3개의 RPC 함수 구현:
  - `request_extra_charge`: 추가 작업 요청
  - `approve_extra_charge`: 관리자 승인
  - `process_customer_decision`: 고객 결정 처리

### 2. Dart Enums
```
lib/core/enums/extra_charge_status.dart    (추가 과금 상태)
lib/core/enums/order_status.dart           (주문 상태 - HOLD, RETURN_PENDING 추가)
```

### 3. 모델
```
lib/features/orders/domain/models/extra_charge_data.dart
```

### 4. 서비스
```
lib/services/extra_charge_service.dart
```

### 5. Provider (상태 관리)
```
lib/features/orders/providers/extra_charge_provider.dart
```

### 6. UI 컴포넌트
```
lib/features/orders/presentation/widgets/request_extra_work_dialog.dart
lib/features/orders/presentation/widgets/extra_charge_request_card.dart
lib/features/orders/presentation/pages/pending_extra_charges_page.dart
```

---

## 🚀 통합 단계

### Step 1: 데이터베이스 마이그레이션

Supabase Dashboard의 SQL Editor에서 실행:

```bash
# 파일 경로
apps/sql/migrations/add_extra_charge_workflow.sql
```

실행 후 확인:
```sql
-- extra_charge_status 컬럼이 추가되었는지 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE 'extra%';

-- RPC 함수가 생성되었는지 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%extra_charge%';
```

### Step 2: Provider 등록

`lib/main.dart` 또는 앱의 Provider 설정 위치에 추가:

```dart
import 'package:provider/provider.dart';
import 'features/orders/providers/extra_charge_provider.dart';

// MultiProvider에 추가
MultiProvider(
  providers: [
    // ... 기존 providers
    ChangeNotifierProvider(create: (_) => ExtraChargeProvider()),
  ],
  child: MyApp(),
)
```

### Step 3: 작업자/관리자 작업 화면에 버튼 추가

작업 화면 (예: `/ops/work` 또는 주문 상세 화면)에 **[추가 작업]** 버튼 추가:

```dart
import 'package:provider/provider.dart';
import 'features/auth/data/providers/auth_provider.dart';
import 'features/orders/presentation/widgets/request_extra_work_dialog.dart';

// 예시: FloatingActionButton 또는 AppBar actions
FloatingActionButton(
  onPressed: () {
    showRequestExtraWorkDialog(
      context: context,
      orderId: widget.orderId,
      onSuccess: () {
        // 성공 후 화면 새로고침
        _refreshOrderData();
      },
    );
  },
  child: const Icon(Icons.add_circle),
  tooltip: '추가 작업 요청',
)
```

**중요**: 이 버튼은 **작업자(WORKER)와 관리자(MANAGER/ADMIN) 모두** 사용 가능합니다.
- **작업자**: 사유만 입력 → 관리자 승인 대기
- **관리자**: 사유 + 금액 + 안내문구 입력 → 즉시 고객에게 전송 (Direct Pass)

### Step 4: 관리자 승인 대기 화면 연결

관리자 메뉴에 **승인 대기** 메뉴 항목 추가:

```dart
// 예: lib/core/router/app_router.dart
GoRoute(
  path: '/pending-extra-charges',
  builder: (context, state) => const PendingExtraChargesPage(),
),

// 관리자 홈 화면 또는 메뉴에 버튼 추가
ListTile(
  leading: const Icon(Icons.pending_actions),
  title: const Text('추가 작업 승인 대기'),
  onTap: () => context.go('/pending-extra-charges'),
)
```

### Step 5: 고객 주문 상세 화면에 카드 추가

`order_detail_page.dart`에 추가 결제 요청 카드 통합:

```dart
import 'package:provider/provider.dart';
import 'features/orders/presentation/widgets/extra_charge_request_card.dart';
import 'features/orders/providers/extra_charge_provider.dart';

// build() 메서드 내부, 주문 정보 상단에 배치
@override
Widget build(BuildContext context) {
  return Scaffold(
    appBar: AppBar(title: const Text('주문 상세')),
    body: SingleChildScrollView(
      child: Column(
        children: [
          // 🆕 추가 결제 요청 카드 (PENDING_CUSTOMER 상태일 때만 표시)
          if (_orderData != null)
            ExtraChargeRequestCard(
              orderId: widget.orderId,
              orderData: _orderData!,
              onActionCompleted: () {
                // 고객이 액션을 취하면 화면 새로고침
                _loadOrderData();
              },
            ),
          
          // ... 기존 주문 상세 정보
        ],
      ),
    ),
  );
}
```

---

## 📊 워크플로우 상태 다이어그램

```
┌─────────────┐
│    NONE     │ (초기 상태)
└──────┬──────┘
       │
       ▼
[작업자 요청] 또는 [관리자 Direct Pass]
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ PENDING_    │   │ PENDING_    │ (관리자 Direct Pass)
│ MANAGER     │   │ CUSTOMER    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 │
[관리자 승인]            │
       │                 │
       └────────┬────────┘
                ▼
         ┌─────────────┐
         │ PENDING_    │
         │ CUSTOMER    │ (고객 결제 대기)
         └──────┬──────┘
                │
       ┌────────┼────────┐
       │        │        │
       ▼        ▼        ▼
   [결제]   [거절]   [반송]
       │        │        │
       ▼        ▼        ▼
┌─────────┐ ┌────────┐ ┌────────────┐
│COMPLETED│ │SKIPPED │ │  RETURN_   │
│         │ │        │ │ REQUESTED  │
└─────────┘ └────────┘ └────────────┘
```

---

## 🔒 보안 및 권한 체크

모든 RPC 함수는 내부적으로 권한을 검증합니다:

1. **request_extra_charge**:
   - WORKER: memo만 허용
   - MANAGER/ADMIN: memo + price + note 허용

2. **approve_extra_charge**:
   - MANAGER/ADMIN만 호출 가능

3. **process_customer_decision**:
   - 주문 소유자(customer)만 호출 가능

---

## 🧪 테스트 시나리오

### 시나리오 1: 작업자 → 관리자 → 고객 (정상 플로우)

1. **작업자** 로그인
2. 주문 상세 화면에서 **[추가 작업]** 버튼 클릭
3. 사유 입력 후 요청
4. **관리자** 로그인
5. **[추가 작업 승인 대기]** 메뉴 진입
6. 해당 주문 선택 → 금액/안내문구 입력 후 승인
7. **고객** 로그인
8. 주문 상세 화면 상단에 **추가 결제 요청 카드** 표시
9. **[결제하기]** / **[그냥 진행]** / **[반송하기]** 중 선택

### 시나리오 2: 관리자 Direct Pass

1. **관리자** 로그인
2. 주문 상세 화면에서 **[추가 작업]** 버튼 클릭
3. 사유 + 금액 + 안내문구 입력
4. 즉시 고객에게 전송 (승인 단계 생략)
5. **고객** 로그인
6. 주문 상세 화면에 바로 **추가 결제 요청 카드** 표시

---

## 🐛 트러블슈팅

### 문제 1: RPC 함수 호출 실패
```
Error: function request_extra_charge does not exist
```
**해결**: SQL 마이그레이션 파일을 다시 실행하세요.

### 문제 2: Provider not found
```
Error: Could not find the correct Provider<ExtraChargeProvider>
```
**해결**: `main.dart`에 `ExtraChargeProvider`를 등록했는지 확인하세요.

### 문제 3: 권한 오류
```
Error: 관리자 권한이 필요합니다
```
**해결**: `users` 테이블에서 해당 사용자의 `role`이 올바른지 확인하세요.

---

## 📝 추가 개선 사항 (향후 구현)

1. **반려(Reject) 기능**: 관리자가 작업자의 요청을 거부
2. **알림(Push Notification)**: 상태 변경 시 관련자에게 알림
3. **히스토리**: 추가 과금 요청/승인/결정 이력 추적
4. **실제 결제 연동**: 현재는 버튼만 구현, 실제 PG사 연동 필요

---

## ✅ 체크리스트

구현 완료 후 다음 항목을 확인하세요:

- [ ] SQL 마이그레이션 실행 완료
- [ ] Provider 등록 완료
- [ ] 작업자/관리자 화면에 **[추가 작업]** 버튼 추가
- [ ] 관리자 승인 대기 화면 메뉴 추가
- [ ] 고객 주문 상세 화면에 카드 추가
- [ ] 작업자 → 관리자 → 고객 플로우 테스트
- [ ] 관리자 Direct Pass 플로우 테스트
- [ ] 권한 검증 테스트

---

## 📞 문의

구현 중 문제가 발생하면 다음을 확인하세요:
1. Flutter 콘솔 로그 (`debugPrint` 메시지)
2. Supabase Dashboard > Logs
3. 이 가이드의 트러블슈팅 섹션

