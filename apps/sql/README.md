# 모두의수선 - Database Schema (Postgres)

Supabase Postgres 데이터베이스 스키마 및 마이그레이션

## 📦 테이블 구조

### 핵심 테이블

1. **users** - 고객 프로필
2. **orders** - 수선 주문
3. **shipments** - 송장/배송 (tracking_no가 핵심)
4. **payments** - 결제 정보
5. **videos** - 입출고 영상
6. **notifications** - 알림
7. **reviews** / **review_settings** - 고객 리뷰·적립 (`schema/19_reviews.sql`)

## 🗂️ 스키마 구조

```
apps/sql/
├── schema/
│   ├── 01_users.sql          # 사용자 테이블
│   ├── 02_orders.sql         # 주문 테이블
│   ├── 03_shipments.sql      # 송장/배송 테이블
│   ├── 04_payments.sql       # 결제 테이블
│   ├── 05_videos.sql         # 영상 테이블
│   └── 06_notifications.sql  # 알림 테이블
├── migrations/               # 마이그레이션 파일
└── README.md
```

## 🎯 핵심 개념

### tracking_no (송장번호)
모든 데이터의 중심이 되는 식별자입니다.

```
orders.tracking_no ← 외래 키
    ↓
shipments.tracking_no ← 기본 키
    ↓
videos.tracking_no ← 외래 키
```

### 데이터 흐름

1. **주문 생성** → `orders` 테이블
2. **결제** → `payments` 테이블
3. **수거예약** → `shipments` 테이블 (tracking_no 생성)
4. **입고** → `videos` 테이블 (INBOUND)
5. **출고** → `videos` 테이블 (OUTBOUND)
6. **알림** → `notifications` 테이블

## 🚀 시작하기

### 1. Supabase CLI 설치

```bash
npm install -g supabase
# 또는
brew install supabase/tap/supabase
```

### 2. 로컬 Supabase 시작

```bash
supabase start
```

### 3. 스키마 적용

```bash
# 모든 스키마 파일 적용
supabase db reset

# 또는 개별 파일 실행
psql -h localhost -p 54322 -U postgres -d postgres -f schema/01_users.sql
```

### 4. 마이그레이션 생성

```bash
# 새 마이그레이션 생성
supabase migration new create_users_table

# 마이그레이션 적용
supabase db push
```

## 📊 ER 다이어그램

```
┌─────────────┐
│   users     │
│  (고객)      │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐       ┌──────────────┐
│   orders    │ 1:1   │  payments    │
│  (주문)      │←─────→│  (결제)       │
└──────┬──────┘       └──────────────┘
       │
       │ 1:1
       ↓
┌─────────────┐       ┌──────────────┐
│ shipments   │ 1:N   │   videos     │
│ (송장/배송)  │←─────→│  (영상)       │
│ tracking_no │       │ tracking_no  │
└──────┬──────┘       └──────────────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│notifications│
│  (알림)      │
└─────────────┘
```

## 🔐 Row Level Security (RLS)

모든 테이블에 RLS가 적용되어 있습니다.

### 사용자 정책
- 사용자는 자신의 데이터만 조회/수정 가능
- `auth.uid()`를 통한 인증 확인

### 관리자 정책
- `@admin.modorepair.com` 이메일 도메인 체크
- 모든 데이터 조회/수정 가능

### 예시

```sql
-- 사용자 정책
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM public.users WHERE id = orders.user_id
  ));

-- 관리자 정책
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );
```

## 📝 ENUM 타입

### order_status
- `PENDING` - 결제 대기
- `PAID` - 결제 완료
- `BOOKED` - 수거예약 완료
- `INBOUND` - 입고 완료
- `PROCESSING` - 수선 중
- `READY_TO_SHIP` - 출고 완료
- `DELIVERED` - 배송 완료
- `CANCELLED` - 취소

### payment_status
- `PENDING` - 결제 대기
- `PAID` - 결제 완료
- `FAILED` - 결제 실패
- `REFUNDED` - 환불

### shipment_status
- `BOOKED` - 수거예약 완료
- `PICKED_UP` - 수거 완료
- `IN_TRANSIT` - 배송 중
- `INBOUND` - 입고 완료
- `PROCESSING` - 수선 중
- `READY_TO_SHIP` - 출고 완료
- `OUT_FOR_DELIVERY` - 배송 중
- `DELIVERED` - 배송 완료

### video_type
- `INBOUND` - 입고 영상
- `OUTBOUND` - 출고 영상

### video_status
- `UPLOADING` - 업로드 중
- `PROCESSING` - 처리 중
- `READY` - 재생 가능
- `FAILED` - 실패
- `DELETED` - 삭제됨

## 🔄 트리거

### updated_at 자동 갱신
모든 테이블에 `updated_at` 자동 갱신 트리거가 적용됩니다.

```sql
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 영상 업로드 시 shipments 업데이트
영상이 업로드되면 자동으로 `shipments` 테이블 업데이트

```sql
CREATE TRIGGER on_video_insert
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_video();
```

## 📊 샘플 데이터

```sql
-- 테스트 사용자
INSERT INTO public.users (auth_id, email, name, phone)
VALUES (
  auth.uid(),
  'test@example.com',
  '홍길동',
  '010-1234-5678'
);

-- 테스트 주문
INSERT INTO public.orders (
  user_id, customer_name, customer_email, customer_phone,
  item_name, base_price, total_price,
  pickup_address, delivery_address
)
VALUES (
  (SELECT id FROM public.users WHERE email = 'test@example.com'),
  '홍길동', 'test@example.com', '010-1234-5678',
  '청바지 기장 수선', 15000, 15000,
  '서울시 강남구 테헤란로 123', '서울시 강남구 테헤란로 123'
);
```

## 🧪 테스트

### psql로 연결

```bash
psql -h localhost -p 54322 -U postgres -d postgres
```

### 테이블 확인

```sql
-- 모든 테이블 조회
\dt public.*

-- 특정 테이블 구조 확인
\d public.orders

-- 데이터 조회
SELECT * FROM public.orders LIMIT 5;
```

## 📦 배포

### Production 배포

```bash
# Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 푸시
supabase db push

# 또는 Supabase Dashboard에서 SQL Editor 사용
```

### 백업

```bash
# 로컬 백업
supabase db dump -f backup.sql

# 복원
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql
```

## 📚 참고 자료

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🤝 기여

1. 새 마이그레이션 생성
2. 스키마 변경 테스트
3. Pull Request 생성

## 라이선스

Private Project

