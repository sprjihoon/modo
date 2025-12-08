# 주문-사용자 자동 연결 시스템

## 📋 개요

주문 데이터를 받아올 때 `customer_email`을 고유 식별자로 사용하여 자동으로 사용자를 매칭하고 포인트 지급이 가능하도록 합니다.

## 🔄 자동 연결 프로세스

### 1. **실시간 자동 연결** (주문 상세 조회 시)

주문 상세 페이지를 열 때 자동으로 실행:

```
주문 로드
    ↓
user_id 확인
    ↓
┌───────────────────────┐
│ user_id가 있는가?     │
└───────────────────────┘
    ↓           ↓
   YES         NO
    ↓           ↓
users 테이블    customer_email로
존재 확인       기존 사용자 검색
    ↓               ↓
   YES         ┌─────────┐
    ↓          │ 있음? │
  완료         └─────────┘
              ↓         ↓
             YES       NO
              ↓         ↓
        주문 연결   새 사용자 생성
              ↓         ↓
              └────┬────┘
                   ↓
            주문에 user_id 설정
                   ↓
            포인트 관리 가능!
```

### 2. **일괄 처리** (기존 주문 정리)

Supabase SQL Editor에서 실행:

```sql
-- auto_link_users_to_orders.sql 실행
```

## 🎯 핵심 기능

### ✅ **자동 사용자 매칭**
- `customer_email`로 기존 사용자 찾기
- 있으면 주문에 연결
- 없으면 새 게스트 사용자 생성

### ✅ **고아 user_id 처리**
- `user_id`는 있지만 `users` 테이블에 없는 경우
- 주문 정보로 사용자 자동 생성
- 기존 UUID 유지

### ✅ **중복 방지**
- 이메일 중복 체크 (`UNIQUE` 제약)
- `ON CONFLICT DO NOTHING` 사용

## 🚀 사용 방법

### **즉시 실행** (현재 상황)

1. Supabase SQL Editor 열기
2. 다음 SQL 실행:

```sql
-- 87375e23-e548-4c5f-983b-13a720741b14 사용자 생성
INSERT INTO users (id, email, name, phone, point_balance, total_earned_points, total_used_points, auth_id)
SELECT 
  '87375e23-e548-4c5f-983b-13a720741b14'::uuid,
  customer_email,
  customer_name,
  COALESCE(customer_phone, '010-0000-0000'),
  0,
  0,
  0,
  NULL
FROM orders
WHERE user_id = '87375e23-e548-4c5f-983b-13a720741b14'
LIMIT 1
ON CONFLICT (id) DO NOTHING;
```

3. 브라우저 새로고침

### **전체 주문 일괄 처리**

```sql
-- migrations/auto_link_users_to_orders.sql 실행
```

## 📊 모니터링

### 현재 상태 확인

```sql
-- 전체 주문 vs user_id 있는 주문
SELECT 
  COUNT(*) as total_orders,
  COUNT(user_id) as orders_with_user,
  COUNT(*) - COUNT(user_id) as orders_without_user
FROM orders;

-- 고아 user_id 확인
SELECT COUNT(*) as orphan_count
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.user_id IS NOT NULL
  AND u.id IS NULL;
```

## 🔧 문제 해결

### "사용자를 찾을 수 없습니다" 에러

**원인**: `user_id`는 있지만 `users` 테이블에 없음

**해결**:
```sql
-- 해당 user_id로 사용자 생성
INSERT INTO users (id, email, name, phone, point_balance, total_earned_points, total_used_points, auth_id)
SELECT 
  user_id,
  customer_email,
  customer_name,
  COALESCE(customer_phone, ''),
  0, 0, 0, NULL
FROM orders
WHERE user_id = '[문제의 user_id]'
LIMIT 1
ON CONFLICT (id) DO NOTHING;
```

### "Cannot coerce..." 에러

**원인**: `.single()` 사용 시 결과가 0개 또는 2개 이상

**해결**: 이미 `.maybeSingle()`로 수정됨 ✅

## 💡 자동화 권장사항

### Cron Job 설정 (선택사항)

Supabase Functions에서 주기적으로 실행:

```typescript
// 매일 자정 실행
Deno.cron("link-orphan-users", "0 0 * * *", async () => {
  // auto_link_users_to_orders.sql 로직 실행
});
```

## 🎉 기대 효과

- ✅ **자동화**: 수동 작업 불필요
- ✅ **데이터 정합성**: 모든 주문에 사용자 연결
- ✅ **포인트 관리**: 모든 주문자에게 포인트 지급 가능
- ✅ **분석 가능**: 사용자별 주문 이력 추적

