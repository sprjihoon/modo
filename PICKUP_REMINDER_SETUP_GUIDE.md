# 📦 수거일 알림 푸시 설정 가이드

우체국 API의 `resDate`(수거 예정일)를 기반으로 D-1, 당일 알림을 자동 발송하는 기능입니다.

## 📋 기능 개요

| 알림 종류 | 발송 시점 | 메시지 예시 |
|-----------|----------|-------------|
| D-1 알림 | 수거일 전날 09:00 | "📦 내일 수거 예정 - 1월 20일 의류 수거가 예정되어 있습니다. 의류를 준비해주세요!" |
| 당일 알림 | 수거일 당일 09:00 | "🚚 오늘 수거일입니다 - 택배기사님이 방문 예정입니다. 문 앞에 의류를 준비해주세요!" |

## 🔧 구현 구조

```
┌─────────────────┐     resDate     ┌─────────────────┐
│  우체국 API     │ ───────────────▶ │  shipments      │
│  (소포신청)     │                  │  테이블         │
└─────────────────┘                  │                 │
                                     │ pickup_scheduled_date
                                     └────────┬────────┘
                                              │
        ┌─────────────────────────────────────┤
        │                                     │
        ▼                                     ▼
┌───────────────┐                    ┌───────────────┐
│   pg_cron     │ ──────────────────▶│ send-pickup-  │
│ (매일 09:00)  │     HTTP POST      │ reminders     │
└───────────────┘                    │ Edge Function │
                                     └───────┬───────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
                  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                  │ notifications│    │   FCM       │    │  shipments  │
                  │ 테이블 생성  │    │ 푸시 발송   │    │ 발송이력    │
                  └─────────────┘    └─────────────┘    └─────────────┘
```

## 📁 생성된 파일

### 1. SQL 마이그레이션

```
apps/sql/migrations/
├── add_pickup_scheduled_date.sql      # shipments 테이블 컬럼 추가
└── setup_pickup_reminder_cron.sql     # Cron Job 설정
```

### 2. Edge Function

```
apps/edge/supabase/functions/
└── send-pickup-reminders/
    └── index.ts                       # 알림 발송 로직
```

### 3. 수정된 파일

```
apps/edge/supabase/functions/
└── shipments-book/
    └── index.ts                       # pickup_scheduled_date 저장 추가
```

## 🚀 배포 순서

### Step 1: SQL 마이그레이션 실행

```bash
# Supabase Dashboard → SQL Editor에서 실행
# 또는 CLI로 실행

# 1. 컬럼 추가
cat apps/sql/migrations/add_pickup_scheduled_date.sql | \
  supabase db push

# 2. Cron Job 설정 (pg_cron, pg_net 확장 필요)
# ⚠️ 먼저 Dashboard에서 확장 활성화 필요
```

### Step 2: Supabase 확장 활성화

1. **Supabase Dashboard** 접속
2. **Database** → **Extensions** 이동
3. 다음 확장 활성화:
   - ✅ `pg_cron` - Cron Job 스케줄링
   - ✅ `pg_net` - HTTP 요청 (Edge Function 호출)

### Step 3: Service Role Key Vault에 저장

```sql
-- Supabase Dashboard → SQL Editor에서 실행
SELECT vault.create_secret(
  'SUPABASE_SERVICE_ROLE_KEY',
  'YOUR_SERVICE_ROLE_KEY_HERE'  -- Dashboard → Settings → API에서 확인
);
```

### Step 4: Cron Job 설정

```sql
-- apps/sql/migrations/setup_pickup_reminder_cron.sql 내용 실행
```

### Step 5: Edge Function 배포

```bash
cd apps/edge
supabase functions deploy send-pickup-reminders
```

## 🧪 테스트 방법

### 1. Edge Function 직접 호출

```bash
# 모든 알림 (D-1 + 당일)
curl -X POST \
  'https://rzrwediccbamxluegnex.supabase.co/functions/v1/send-pickup-reminders' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"type": "ALL"}'

# D-1 알림만
curl -X POST ... -d '{"type": "D-1"}'

# 당일 알림만
curl -X POST ... -d '{"type": "TODAY"}'
```

### 2. SQL로 Cron 함수 직접 호출

```sql
SELECT invoke_pickup_reminders();
```

### 3. 테스트 데이터 생성

```sql
-- 내일 수거 예정인 테스트 데이터
UPDATE shipments 
SET pickup_scheduled_date = CURRENT_DATE + INTERVAL '1 day',
    pickup_reminder_sent_at = NULL
WHERE id = 'YOUR_TEST_SHIPMENT_ID';
```

### 4. Cron Job 실행 이력 확인

```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'send-pickup-reminders-daily'
ORDER BY start_time DESC 
LIMIT 10;
```

## 📊 모니터링

### 알림 발송 현황 조회

```sql
-- 오늘 발송된 수거일 알림
SELECT * FROM notifications
WHERE type IN ('pickup_reminder', 'pickup_today')
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- D-1 알림 발송 이력
SELECT 
  s.order_id,
  s.tracking_no,
  s.pickup_scheduled_date,
  s.pickup_reminder_sent_at,
  s.pickup_day_reminder_sent_at
FROM shipments s
WHERE s.pickup_scheduled_date >= CURRENT_DATE
ORDER BY s.pickup_scheduled_date;
```

## ⚠️ 주의사항

1. **시간대**: Supabase는 UTC 기준입니다. 한국 시간 09:00 = UTC 00:00
2. **중복 발송 방지**: `pickup_reminder_sent_at`, `pickup_day_reminder_sent_at` 컬럼으로 체크
3. **FCM 토큰**: 사용자의 `fcm_token`이 없으면 앱 내 알림만 생성됨
4. **상태 체크**: `status = 'BOOKED'`인 경우에만 알림 발송

## 🔍 트러블슈팅

### pg_cron 확장이 없다는 에러

```sql
-- 에러: extension "pg_cron" is not available
-- 해결: Supabase Dashboard → Database → Extensions → pg_cron 활성화
```

### Edge Function 호출 실패

```sql
-- pg_net 로그 확인
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;
```

### 알림이 발송되지 않음

1. `pickup_scheduled_date`가 올바르게 저장되었는지 확인
2. `status`가 'BOOKED'인지 확인
3. `pickup_reminder_sent_at`이 NULL인지 확인

```sql
-- 알림 대상 확인
SELECT * FROM shipments
WHERE pickup_scheduled_date = CURRENT_DATE + INTERVAL '1 day'
  AND status = 'BOOKED'
  AND pickup_reminder_sent_at IS NULL;
```

## 📝 관련 파일

- `apps/edge/supabase/functions/_shared/epost/` - 우체국 API 모듈
- `apps/edge/supabase/functions/shipments-book/` - 수거 예약 (resDate 저장)
- `apps/sql/migrations/create_notifications_table.sql` - 알림 테이블

