# 🚨 CRITICAL: 마이그레이션 실행 순서 가이드

## ⚠️ 중요 경고

**잘못된 순서로 마이그레이션을 실행하면 앱이 작동하지 않을 수 있습니다!**

반드시 아래 순서대로 실행하세요.

---

## 📋 실행 순서 (MANDATORY)

### 1️⃣ 사용자 role 컬럼 추가 (선행 조건)

**파일**: `apps/sql/migrations/add_user_role.sql`

**목적**: `users` 테이블에 `role` 컬럼 추가 (ADMIN, MANAGER, WORKER, CUSTOMER)

**실행 방법**:
```bash
# Option 1: Supabase CLI
cd /Users/jangjihoon/modo
supabase db push --file apps/sql/migrations/add_user_role.sql

# Option 2: Supabase Dashboard
# SQL Editor에서 파일 내용 복사 & 실행
```

**확인**:
```sql
-- users 테이블에 role 컬럼이 있는지 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
```

예상 결과:
```
column_name | data_type  | column_default
------------+------------+----------------
role        | user_role  | 'WORKER'::user_role
```

---

### 2️⃣ 🚨 고객용 role 설정 수정 (CRITICAL!)

**파일**: `apps/sql/migrations/fix_user_role_for_customers.sql`

**목적**: 
- CUSTOMER role 추가
- 기본값을 CUSTOMER로 변경
- 기존 사용자를 CUSTOMER로 마이그레이션
- 회원가입 트리거 추가

**⚠️ 이 단계를 건너뛰면 앱이 작동하지 않습니다!**

**실행 방법**:
```bash
# Option 1: Supabase CLI
supabase db push --file apps/sql/migrations/fix_user_role_for_customers.sql

# Option 2: Supabase Dashboard
# SQL Editor에서 파일 내용 복사 & 실행
```

**확인**:
```sql
-- 1. CUSTOMER role이 추가되었는지 확인
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumlabel;
```

예상 결과:
```
enumlabel
----------
ADMIN
CUSTOMER
MANAGER
WORKER
```

```sql
-- 2. 기본값이 CUSTOMER로 변경되었는지 확인
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
```

예상 결과:
```
column_default
-------------------
'CUSTOMER'::user_role
```

```sql
-- 3. 기존 사용자들이 CUSTOMER로 업데이트되었는지 확인
SELECT role, COUNT(*) as count
FROM public.users
GROUP BY role
ORDER BY role;
```

예상 결과:
```
role     | count
---------+-------
ADMIN    | 1
CUSTOMER | 10
MANAGER  | 0
WORKER   | 0
```

---

### 3️⃣ 주문 데이터 RLS 정책 적용

**파일**: `apps/sql/migrations/add_orders_rls_customer_privacy.sql`

**목적**: `orders`, `shipments` 테이블에 소유자 기반 RLS 정책 적용

**실행 방법**:
```bash
supabase db push --file apps/sql/migrations/add_orders_rls_customer_privacy.sql
```

**확인**:
```sql
-- orders 테이블 RLS 정책 확인
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'orders'
ORDER BY policyname;
```

---

### 4️⃣ 전체 테이블 RLS 정책 적용

**파일**: `apps/sql/migrations/add_comprehensive_rls_privacy_all_tables.sql`

**목적**: 모든 개인 데이터 테이블에 RLS 정책 통합 적용

**실행 방법**:
```bash
supabase db push --file apps/sql/migrations/add_comprehensive_rls_privacy_all_tables.sql
```

**확인**:
```sql
-- 모든 테이블의 RLS 정책 확인
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'shipments', 'addresses', 'payments', 'point_transactions')
GROUP BY tablename
ORDER BY tablename;
```

예상 결과:
```
tablename            | policy_count
---------------------+-------------
addresses            | 6
orders               | 7
payments             | 6
point_transactions   | 5
shipments            | 4
users                | 5
```

---

## 🧪 전체 마이그레이션 확인 체크리스트

### 1. role 컬럼 확인
```sql
-- ✅ role 컬럼이 존재하고 기본값이 CUSTOMER인지 확인
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';
```

### 2. CUSTOMER role 확인
```sql
-- ✅ CUSTOMER가 user_role ENUM에 포함되어 있는지 확인
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role' AND e.enumlabel = 'CUSTOMER';
```

### 3. 기존 사용자 role 확인
```sql
-- ✅ 모든 사용자가 유효한 role을 가지고 있는지 확인
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'CUSTOMER' THEN 1 END) as customers,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles
FROM public.users;
```

**예상 결과**: `null_roles`가 0이어야 합니다.

### 4. RLS 정책 활성화 확인
```sql
-- ✅ 모든 테이블에 RLS가 활성화되어 있는지 확인
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'shipments', 'addresses', 'payments', 'point_transactions')
ORDER BY tablename;
```

**예상 결과**: 모든 테이블의 `rowsecurity`가 `true`여야 합니다.

### 5. 트리거 확인
```sql
-- ✅ 회원가입 트리거가 생성되었는지 확인
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**예상 결과**:
```
trigger_name         | event_manipulation | event_object_table
---------------------+--------------------+--------------------
on_auth_user_created | INSERT             | users
```

---

## 🐛 문제 해결 (Troubleshooting)

### 문제 1: "type user_role does not exist"

**원인**: `add_user_role.sql`을 실행하지 않았거나 실패했습니다.

**해결**:
```sql
-- user_role ENUM 타입이 존재하는지 확인
SELECT typname FROM pg_type WHERE typname = 'user_role';

-- 없으면 add_user_role.sql을 다시 실행
```

---

### 문제 2: "value 'CUSTOMER' does not exist for enum type user_role"

**원인**: `fix_user_role_for_customers.sql`을 실행하지 않았습니다.

**해결**:
```sql
-- CUSTOMER가 있는지 확인
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role';

-- CUSTOMER가 없으면 fix_user_role_for_customers.sql을 다시 실행
```

---

### 문제 3: "column 'role' does not exist"

**원인**: `add_user_role.sql`의 ALTER TABLE이 실행되지 않았습니다.

**해결**:
```sql
-- role 컬럼이 있는지 확인
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- 없으면 수동으로 추가
ALTER TABLE public.users 
ADD COLUMN role user_role NOT NULL DEFAULT 'CUSTOMER';
```

---

### 문제 4: 회원가입 후 프로필이 생성되지 않음

**원인**: 트리거가 생성되지 않았거나, RLS 정책이 INSERT를 막고 있습니다.

**해결**:
```sql
-- 1. 트리거 확인
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. 트리거 재생성
-- fix_user_role_for_customers.sql의 트리거 부분을 다시 실행

-- 3. RLS 정책 확인 (INSERT 정책이 있는지)
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';
```

---

### 문제 5: 기존 사용자가 본인 데이터를 조회할 수 없음

**원인**: 기존 사용자의 `role`이 `NULL`이거나 `WORKER`입니다.

**해결**:
```sql
-- 기존 사용자를 모두 CUSTOMER로 업데이트
UPDATE public.users
SET role = 'CUSTOMER'
WHERE role IS NULL OR role = 'WORKER'
  AND email NOT LIKE '%@admin.modusrepair.com'
  AND email NOT LIKE '%@manager.modusrepair.com';
```

---

## 🔄 롤백 (긴급 상황 시)

**⚠️ 주의: 롤백 시 모든 보안 정책이 제거됩니다!**

### 전체 RLS 정책 비활성화 (임시 조치)
```sql
-- ⚠️ 프로덕션에서는 절대 사용하지 마세요!
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions DISABLE ROW LEVEL SECURITY;

-- 문제 해결 후 다시 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- (나머지 테이블도 동일)
```

### role 컬럼 제거 (최후의 수단)
```sql
-- ⚠️ 데이터 손실 주의!
ALTER TABLE public.users DROP COLUMN role;

-- 트리거 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auto_create_user_profile();

-- ENUM 타입 제거
DROP TYPE IF EXISTS user_role CASCADE;
```

---

## 📞 지원

문제가 해결되지 않으면:
1. 전체 마이그레이션 로그 확인
2. Supabase Dashboard > Logs 확인
3. GitHub Issues 생성 (보안 관련은 Private)

---

**✅ 이 가이드를 따라 순서대로 실행하면 안전하게 마이그레이션할 수 있습니다!**

