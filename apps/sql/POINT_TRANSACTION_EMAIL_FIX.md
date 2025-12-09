# 포인트 거래 내역 사용자 매칭 개선

## 문제점
- 주문 생성 시 잘못된 `user_id` (auth.users.id) 저장
- 포인트 거래 내역과 고객 정보가 매칭되지 않음
- 포인트 내역에서 고객 정보를 확인할 수 없는 문제 발생

## 해결 방법
1. 모바일 앱에서 올바른 `user_id` (public.users.id) 사용
2. 기존 데이터를 auth_id 기준으로 수정
3. 포인트 거래 테이블에 `customer_email` 컬럼 추가 (표시용)
4. 포인트 내역 클릭 시 고객 상세 페이지로 이동

## ⚠️ 중요: 이메일은 매칭 키로 사용하지 않음
- **이메일은 변경 가능**하므로 신뢰할 수 없는 키
- **오직 `user_id` (UUID)로만 매칭**
- 이메일은 화면 표시 목적으로만 사용

## 마이그레이션 실행 순서

### 1. 이메일 인덱스 추가
```bash
# Supabase SQL Editor에서 실행
```

```sql
-- apps/sql/migrations/add_email_index_to_users.sql 내용 실행
```

### 2. 포인트 거래 테이블에 이메일 컬럼 추가
```sql
-- apps/sql/migrations/add_customer_email_to_point_transactions.sql 내용 실행
```

### 3. 포인트 지급 함수 업데이트
```sql
-- apps/sql/migrations/update_manage_user_points_function.sql 내용 실행
```

## 실행 방법

### Supabase Dashboard에서 실행
1. Supabase 대시보드 접속
2. SQL Editor 메뉴로 이동
3. 위의 마이그레이션 파일들을 순서대로 실행

### 또는 명령줄에서 실행
```bash
# Supabase CLI 사용
cd apps/sql/migrations

# 1. 이메일 인덱스 추가
supabase db execute --file add_email_index_to_users.sql

# 2. 포인트 거래 테이블 업데이트
supabase db execute --file add_customer_email_to_point_transactions.sql

# 3. 함수 업데이트
supabase db execute --file update_manage_user_points_function.sql
```

## 변경 사항

### 데이터베이스
- ✅ `users` 테이블에 이메일 인덱스 추가
- ✅ `point_transactions` 테이블에 `customer_email` 컬럼 추가
- ✅ 기존 데이터에 대해 이메일 자동 업데이트
- ✅ `manage_user_points` 함수에서 이메일 자동 저장

### API
- ✅ 포인트 거래 내역 조회 시 이메일 기반 매칭
- ✅ 검색 기능에 이메일 검색 추가
- ✅ `customer_email` 필드를 통한 사용자 정보 조회

### 프론트엔드
- ✅ 포인트 내역에 이메일 표시
- ✅ 포인트 내역 클릭 시 고객 상세 페이지로 이동
- ✅ userId가 없는 경우 안내 메시지 표시
- ✅ 검색 플레이스홀더에 이메일 검색 안내 추가

## 테스트 방법

1. 관리자 페이지 접속: http://localhost:3002
2. 포인트 관리 > 포인트 내역 탭으로 이동
3. 이메일로 검색 테스트
4. 포인트 내역 클릭하여 고객 상세 페이지로 이동 확인
5. userId가 없는 내역의 경우 안내 메시지 확인

## 주의사항
- 마이그레이션 실행 전 데이터베이스 백업 권장
- 기존 데이터에 대해 자동으로 이메일이 업데이트됨
- 이후 생성되는 모든 포인트 거래에는 자동으로 이메일이 저장됨

