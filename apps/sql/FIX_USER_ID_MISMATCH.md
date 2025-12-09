# User ID 불일치 문제 해결 가이드

## 🔴 문제 발견

### 근본 원인
모바일 앱에서 주문 생성 시 `orders.user_id`에 **`auth.users.id`를 직접 저장**하고 있었습니다.

하지만 데이터베이스 스키마는 **`public.users.id`를 참조**하도록 설계되어 있습니다:

```sql
-- orders 테이블 스키마
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
```

### 문제의 영향
1. ❌ 포인트 거래 내역이 사용자와 매칭되지 않음
2. ❌ 주문과 사용자 정보 연결 실패
3. ❌ 포인트 자동 적립 실패 가능성

### ⚠️ 중요: 이메일은 매칭 키로 사용하지 않음
- 이메일은 사용자가 변경할 수 있으므로 **신뢰할 수 없는 키**
- **오직 `user_id` (UUID)와 `auth_id`만 사용**하여 매칭
- 이메일은 표시 목적으로만 저장

## ✅ 해결 방법

### 1. 모바일 앱 수정 (완료)

**`apps/mobile/lib/services/order_service.dart`**

변경 전:
```dart
final user = _supabase.auth.currentUser;
final orderData = {
  'user_id': user.id,  // ❌ auth.users.id 직접 사용
  ...
};
```

변경 후:
```dart
// public.users 테이블에서 실제 user_id 조회
final userResponse = await _supabase
    .from('users')
    .select('id, email, name, phone')
    .eq('auth_id', user.id)
    .maybeSingle();

final userId = userResponse['id'] as String;

final orderData = {
  'user_id': userId,  // ✅ public.users.id 사용
  ...
};
```

### 2. 기존 데이터 수정 (마이그레이션 필요)

**`apps/sql/migrations/fix_orders_user_id_mismatch.sql`** 실행

이 마이그레이션은:
1. ✅ orders.user_id를 auth_id 기준으로 public.users.id로 변경
2. ✅ 매칭되지 않은 주문 수 확인 및 로그 출력
3. ⚠️ 이메일 기반 매칭은 하지 않음 (이메일은 변경 가능하므로)

## 🚀 마이그레이션 실행

### Supabase Dashboard에서 실행

1. Supabase 대시보드 접속
2. SQL Editor 메뉴로 이동
3. 다음 순서대로 실행:

```sql
-- 1. 주문 user_id 수정
-- apps/sql/migrations/fix_orders_user_id_mismatch.sql 실행

-- 2. 포인트 거래 이메일 필드 추가
-- apps/sql/migrations/add_customer_email_to_point_transactions.sql 실행

-- 3. 이메일 인덱스 추가
-- apps/sql/migrations/add_email_index_to_users.sql 실행

-- 4. 포인트 함수 업데이트
-- apps/sql/migrations/update_manage_user_points_function.sql 실행
```

### 명령줄에서 실행

```bash
cd apps/sql/migrations

# 1. 주문 user_id 수정
supabase db execute --file fix_orders_user_id_mismatch.sql

# 2. 포인트 거래 이메일 필드 추가
supabase db execute --file add_customer_email_to_point_transactions.sql

# 3. 이메일 인덱스 추가
supabase db execute --file add_email_index_to_users.sql

# 4. 포인트 함수 업데이트
supabase db execute --file update_manage_user_points_function.sql
```

## 🧪 테스트 방법

### 1. 데이터 확인

```sql
-- 주문과 사용자 매칭 확인
SELECT 
  o.id as order_id,
  o.customer_email,
  o.user_id,
  u.id as public_user_id,
  u.auth_id,
  u.email,
  u.name
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LIMIT 10;

-- 포인트 거래와 사용자 매칭 확인
SELECT 
  pt.id,
  pt.user_id,
  pt.customer_email,
  pt.description,
  u.name,
  u.email
FROM point_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC
LIMIT 10;
```

### 2. 모바일 앱 테스트

1. 앱 재시작
2. 새 주문 생성
3. 관리자 페이지에서 확인:
   - 주문 목록에 고객 정보 표시 확인
   - 포인트 내역에 사용자 매칭 확인

### 3. 관리자 페이지 테스트

1. http://localhost:3002 접속
2. 포인트 관리 > 포인트 내역
3. 모든 거래 내역에 사용자 정보 표시 확인
4. 포인트 내역 클릭 시 고객 상세 페이지로 이동 확인

## ⚠️ 주의사항

### 마이그레이션 전 백업
```bash
# 데이터베이스 백업 (권장)
pg_dump -h your-db-host -U postgres -d your-db-name > backup_$(date +%Y%m%d).sql
```

### 매칭되지 않은 주문 처리

마이그레이션 후 매칭되지 않은 주문이 있다면:

1. **관리자 페이지에서 수동으로 사용자 연결**
   - 주문 상세 페이지에서 "사용자 연결" 기능 사용
   - auth_id를 기준으로 올바른 user_id 연결

2. **또는 해당 고객에게 회원가입 유도**
   - 회원가입 시 auth_id가 생성되면 자동으로 매칭됨

⚠️ **주의**: 이메일로 매칭하지 마세요! 이메일은 변경 가능합니다.

## 📊 예상 결과

### Before (문제 상황)
```
orders.user_id = "550e8400-e29b-41d4-a716-446655440000"  (auth.users.id)
users.id       = "7c9e6679-7425-40de-944b-e07fc1f90ae7"  (public.users.id)
users.auth_id  = "550e8400-e29b-41d4-a716-446655440000"

❌ 매칭 실패!
```

### After (해결 후)
```
orders.user_id = "7c9e6679-7425-40de-944b-e07fc1f90ae7"  (public.users.id)
users.id       = "7c9e6679-7425-40de-944b-e07fc1f90ae7"  (public.users.id)
users.auth_id  = "550e8400-e29b-41d4-a716-446655440000"

✅ 정상 매칭!
```

## 🎯 체크리스트

- [ ] 데이터베이스 백업 완료
- [ ] `fix_orders_user_id_mismatch.sql` 실행
- [ ] `add_customer_email_to_point_transactions.sql` 실행
- [ ] `add_email_index_to_users.sql` 실행
- [ ] `update_manage_user_points_function.sql` 실행
- [ ] 모바일 앱 코드 업데이트 (git pull)
- [ ] 관리자 페이지 테스트
- [ ] 모바일 앱 테스트
- [ ] 포인트 내역 매칭 확인

## 📞 문제 발생 시

마이그레이션 중 문제가 발생하면:

1. 백업에서 복구
2. 에러 메시지 확인
3. 매칭되지 않은 주문 수동 처리
4. 필요시 개발팀 문의

