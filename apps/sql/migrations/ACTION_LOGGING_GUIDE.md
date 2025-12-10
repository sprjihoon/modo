# Action Logging System 사용 가이드

## 📌 개요

모든 사용자의 업무 활동을 기록하는 Action Logging System입니다.
- **목적**: KPI 분석 및 사고 발생 시 추적(Audit)
- **대상**: ADMIN, MANAGER, WORKER의 모든 주요 활동
- **자동화**: 기존 서비스에 통합되어 자동으로 로그 기록

---

## 🗄️ 데이터베이스 마이그레이션

### 1. 마이그레이션 실행

```bash
# Supabase Dashboard > SQL Editor에서 실행
# 또는 Supabase CLI 사용
supabase db push
```

마이그레이션 파일: `create_action_logs.sql`

### 2. 생성되는 테이블

**`action_logs` 테이블**

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `log_id` | UUID | 로그 고유 ID (Primary Key) |
| `actor_id` | UUID | 행위자 User ID (users 테이블 FK) |
| `actor_name` | TEXT | 행위자 이름 (검색 편의성) |
| `actor_role` | TEXT | 행위자 역할 (ADMIN, MANAGER, WORKER) |
| `action_type` | ENUM | 액션 타입 (아래 참조) |
| `target_id` | TEXT | 대상 주문 ID (Invoice No) 또는 사용자 ID |
| `metadata` | JSONB | 추가 정보 (상태 변경, 금액 등) |
| `timestamp` | TIMESTAMPTZ | 액션 발생 시각 (서버 시간) |

### 3. ActionType Enum

```sql
-- COMMON
'LOGIN'              -- 로그인
'LOGOUT'             -- 로그아웃

-- WORKER
'SCAN_INBOUND'       -- 입고 스캔
'WORK_START'         -- 작업 시작
'WORK_COMPLETE'      -- 작업 완료
'REQ_EXTRA_CHARGE'   -- 추가과금 요청

-- MANAGER
'APPROVE_EXTRA'      -- 추가과금 승인
'REJECT_EXTRA'       -- 추가과금 거부
'SCAN_OUTBOUND'      -- 출고 스캔
'RETURN_PROCESS'     -- 반품 처리

-- ADMIN
'UPDATE_USER'        -- 사용자 정보 수정
'DELETE_USER'        -- 사용자 삭제
```

---

## 📱 Flutter (Mobile) 사용법

### 1. Import

```dart
import 'package:your_app/services/log_service.dart';
import 'package:your_app/core/enums/action_type.dart';
```

### 2. 기본 사용

```dart
final logService = LogService();

// 로그 기록 (자동으로 현재 사용자 정보 포함)
await logService.log(
  actionType: ActionType.WORK_START,
  targetId: orderId,
  metadata: {
    'workItemId': 'item-123',
    'workItemName': '지퍼 수선',
  },
);
```

### 3. 이미 통합된 기능

다음 기능들은 **자동으로 로그가 기록**됩니다:

#### ✅ AuthService
- **로그인 성공**: `ActionType.LOGIN`
- **로그아웃**: `ActionType.LOGOUT`

#### ✅ ExtraChargeService
- **추가과금 요청**: `ActionType.REQ_EXTRA_CHARGE`
- **추가과금 승인**: `ActionType.APPROVE_EXTRA`
- **추가과금 거부**: `ActionType.REJECT_EXTRA`

#### ✅ OrderService (Helper 메서드 제공)
```dart
// 입고 스캔
await orderService.logScanInbound(
  orderId: orderId,
  trackingNo: trackingNo,
);

// 출고 스캔
await orderService.logScanOutbound(
  orderId: orderId,
  trackingNo: trackingNo,
);

// 작업 시작
await orderService.logWorkStart(
  orderId: orderId,
  workItemId: workItemId,
  workItemName: '지퍼 수선',
);

// 작업 완료
await orderService.logWorkComplete(
  orderId: orderId,
  workItemId: workItemId,
  workItemName: '지퍼 수선',
  duration: 3600, // 초 단위
);

// 반품 처리
await orderService.logReturnProcess(
  orderId: orderId,
  reason: '고객 변심',
);
```

### 4. 로그 조회

```dart
// 내 로그 조회
final myLogs = await logService.getLogsByUser(limit: 50);

// 특정 주문의 모든 로그 조회
final orderLogs = await logService.getLogsByTarget(targetId: orderId);

// 특정 액션 타입 조회
final workLogs = await logService.getLogsByActionType(
  actionType: ActionType.WORK_COMPLETE,
);

// 날짜 범위 조회
final logs = await logService.getLogsByDateRange(
  startDate: DateTime(2025, 1, 1),
  endDate: DateTime(2025, 12, 31),
);

// 전체 로그 조회 (ADMIN 전용)
final allLogs = await logService.getAllLogs(limit: 100);
```

---

## 💻 Next.js Admin (Web) 사용법

### 1. Import

```typescript
import { logAction } from '@/lib/api/action-logs';
import { ActionType } from '@/lib/types/action-log';
```

### 2. 기본 사용

```typescript
// 로그 기록
await logAction(
  ActionType.APPROVE_EXTRA,
  orderId,
  {
    price: 5000,
    note: '추가 작업 필요',
  }
);
```

### 3. 이미 통합된 기능

#### ✅ 로그인 페이지 (`/login`)
- **로그인 성공**: `ActionType.LOGIN`

### 4. 로그 조회

```typescript
import {
  getLogsByUser,
  getLogsByTarget,
  getLogsByActionType,
  getLogsByDateRange,
  getAllLogs,
} from '@/lib/api/action-logs';

// 특정 사용자 로그
const userLogs = await getLogsByUser(userId, 50);

// 특정 주문 로그
const orderLogs = await getLogsByTarget(orderId);

// 특정 액션 타입 로그
const loginLogs = await getLogsByActionType(ActionType.LOGIN);

// 날짜 범위 로그
const logs = await getLogsByDateRange(
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// 전체 로그 (ADMIN 전용)
const allLogs = await getAllLogs(100);
```

---

## 🔍 로그 조회 예시

### SQL 직접 조회

```sql
-- 최근 100개 로그
SELECT * FROM action_logs
ORDER BY timestamp DESC
LIMIT 100;

-- 특정 주문의 로그
SELECT * FROM action_logs
WHERE target_id = 'order-id-here'
ORDER BY timestamp DESC;

-- 특정 사용자의 로그
SELECT * FROM action_logs
WHERE actor_id = 'user-id-here'
ORDER BY timestamp DESC;

-- 특정 액션 타입 로그
SELECT * FROM action_logs
WHERE action_type = 'WORK_COMPLETE'
ORDER BY timestamp DESC;

-- 오늘 발생한 모든 로그
SELECT * FROM action_logs
WHERE timestamp >= CURRENT_DATE
ORDER BY timestamp DESC;

-- 작업자별 작업 완료 통계 (KPI)
SELECT 
  actor_name,
  actor_role,
  COUNT(*) as work_count,
  DATE(timestamp) as work_date
FROM action_logs
WHERE action_type = 'WORK_COMPLETE'
GROUP BY actor_name, actor_role, DATE(timestamp)
ORDER BY work_date DESC, work_count DESC;
```

---

## 📊 KPI 분석 쿼리 예시

### 1. 일일 작업 생산성

```sql
SELECT 
  actor_name,
  COUNT(*) FILTER (WHERE action_type = 'WORK_COMPLETE') as completed_works,
  COUNT(*) FILTER (WHERE action_type = 'WORK_START') as started_works,
  DATE(timestamp) as work_date
FROM action_logs
WHERE action_type IN ('WORK_START', 'WORK_COMPLETE')
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY actor_name, DATE(timestamp)
ORDER BY work_date DESC, completed_works DESC;
```

### 2. 추가과금 승인율

```sql
SELECT 
  COUNT(*) FILTER (WHERE action_type = 'REQ_EXTRA_CHARGE') as total_requests,
  COUNT(*) FILTER (WHERE action_type = 'APPROVE_EXTRA') as approved,
  COUNT(*) FILTER (WHERE action_type = 'REJECT_EXTRA') as rejected,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE action_type = 'APPROVE_EXTRA') / 
    NULLIF(COUNT(*) FILTER (WHERE action_type = 'REQ_EXTRA_CHARGE'), 0), 
    2
  ) as approval_rate
FROM action_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days';
```

### 3. 평균 작업 소요 시간

```sql
WITH work_sessions AS (
  SELECT 
    target_id,
    actor_name,
    MIN(timestamp) FILTER (WHERE action_type = 'WORK_START') as start_time,
    MAX(timestamp) FILTER (WHERE action_type = 'WORK_COMPLETE') as end_time
  FROM action_logs
  WHERE action_type IN ('WORK_START', 'WORK_COMPLETE')
    AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY target_id, actor_name
)
SELECT 
  actor_name,
  COUNT(*) as completed_works,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) as avg_hours
FROM work_sessions
WHERE start_time IS NOT NULL AND end_time IS NOT NULL
GROUP BY actor_name
ORDER BY avg_hours;
```

---

## 🔐 보안 및 권한

### RLS (Row Level Security) 정책

- **ADMIN**: 모든 로그 조회 가능
- **MANAGER**: 모든 로그 조회 가능
- **WORKER**: 자신의 로그만 조회 가능
- **모든 사용자**: 자신의 로그만 생성 가능

### 주의사항

⚠️ **로그 기록 실패 시**
- 앱의 주요 기능에 영향을 주지 않도록 에러는 무시됩니다
- 콘솔에 에러 로그만 출력됩니다

⚠️ **민감한 정보**
- 비밀번호, 토큰 등은 metadata에 저장하지 마세요
- 개인정보는 최소한으로 기록하세요

---

## 🧪 테스트 가이드

### 1. 로그인 테스트

```dart
// Flutter
await authService.signInWithEmail(
  email: 'worker@test.com',
  password: 'password123',
);

// 확인
final logs = await logService.getLogsByActionType(
  actionType: ActionType.LOGIN,
);
print(logs); // LOGIN 로그가 생성되었는지 확인
```

### 2. 작업 시작/완료 테스트

```dart
// 작업 시작
await orderService.logWorkStart(
  orderId: 'test-order-id',
  workItemName: '테스트 작업',
);

// 작업 완료
await orderService.logWorkComplete(
  orderId: 'test-order-id',
  workItemName: '테스트 작업',
  duration: 1800, // 30분
);

// 확인
final orderLogs = await logService.getLogsByTarget(
  targetId: 'test-order-id',
);
print(orderLogs); // WORK_START, WORK_COMPLETE 로그 확인
```

---

## 📚 참고 자료

### 파일 위치

**SQL 마이그레이션**
- `/apps/sql/migrations/create_action_logs.sql`

**Flutter (Dart)**
- Enum: `/apps/mobile/lib/core/enums/action_type.dart`
- Service: `/apps/mobile/lib/services/log_service.dart`
- 통합: `/apps/mobile/lib/services/auth_service.dart`
- 통합: `/apps/mobile/lib/services/order_service.dart`
- 통합: `/apps/mobile/lib/services/extra_charge_service.dart`

**Next.js (TypeScript)**
- Types: `/apps/admin/lib/types/action-log.ts`
- Service: `/apps/admin/lib/api/action-logs.ts`
- 통합: `/apps/admin/app/login/page.tsx`

### 추가 구현 예정

- [ ] 작업 시작/완료 UI 구현 (Flutter)
- [ ] 입출고 스캔 UI 구현 (Flutter)
- [ ] 로그 대시보드 구현 (Admin)
- [ ] 실시간 로그 모니터링 (Admin)
- [ ] 로그 내보내기 기능 (CSV, Excel)

---

## 💡 문의

문제가 발생하거나 추가 기능이 필요한 경우:
1. GitHub Issues 생성
2. 개발팀에 문의
3. 문서 업데이트 제안

---

**마지막 업데이트**: 2025-12-10
**작성자**: AI Assistant
**버전**: 1.0.0

