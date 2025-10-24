# 모두의수선 - 데이터베이스 스키마

## 📊 ER 다이어그램

```
┌─────────────┐
│   users     │
│  (고객)      │
│             │
│ - id        │
│ - auth_id   │
│ - email     │
│ - name      │
│ - phone     │
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────────┐       ┌──────────────┐
│   orders        │ 1:1   │  payments    │
│  (주문)          │←─────→│  (결제)       │
│                 │       │              │
│ - id            │       │ - id         │
│ - user_id       │       │ - order_id   │
│ - tracking_no ──┼──┐    │ - imp_uid    │
│ - status        │  │    │ - amount     │
│ - total_price   │  │    └──────────────┘
└─────────────────┘  │
                     │ FK (tracking_no)
                     ↓
┌──────────────────────┐       ┌──────────────┐
│ shipments            │ 1:N   │   videos     │
│ (송장/배송)           │←─────→│  (영상)       │
│                      │       │              │
│ - id                 │       │ - id         │
│ - order_id           │       │ - tracking_no│
│ - tracking_no (PK)   │       │ - video_type │
│ - status             │       │ - stream_url │
│ - inbound_video_id   │       └──────────────┘
│ - outbound_video_id  │
└──────────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────┐
│ notifications   │
│  (알림)          │
│                 │
│ - id            │
│ - user_id       │
│ - type          │
│ - tracking_no   │
└─────────────────┘
```

## 📋 테이블 상세

### 1. users (고객)

고객 프로필 정보를 저장합니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| auth_id | UUID | YES | - | Supabase Auth ID |
| email | TEXT | NO | - | 이메일 (UNIQUE) |
| name | TEXT | NO | - | 이름 |
| phone | TEXT | NO | - | 전화번호 (UNIQUE) |
| default_address | TEXT | YES | - | 기본 주소 |
| default_address_detail | TEXT | YES | - | 상세 주소 |
| default_zipcode | TEXT | YES | - | 우편번호 |
| fcm_token | TEXT | YES | - | FCM 토큰 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 수정 시각 |

**인덱스:**
- `idx_users_auth_id` on `auth_id`
- `idx_users_email` on `email`
- `idx_users_phone` on `phone`

**RLS:**
- 사용자는 자신의 정보만 조회/수정
- 관리자는 모든 정보 조회

---

### 2. orders (주문)

수선 주문 정보를 저장합니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| user_id | UUID | NO | - | 고객 ID (FK) |
| customer_name | TEXT | NO | - | 고객명 |
| customer_email | TEXT | NO | - | 고객 이메일 |
| customer_phone | TEXT | NO | - | 고객 전화번호 |
| item_name | TEXT | NO | - | 수선 항목 |
| item_description | TEXT | YES | - | 상세 설명 |
| item_category | TEXT | YES | - | 카테고리 |
| image_urls | TEXT[] | YES | - | 이미지 URL 배열 |
| base_price | INTEGER | NO | 0 | 기본 가격 |
| additional_price | INTEGER | YES | 0 | 추가 가격 |
| total_price | INTEGER | NO | - | 총 가격 |
| status | order_status | NO | PENDING | 주문 상태 |
| payment_status | payment_status | NO | PENDING | 결제 상태 |
| tracking_no | TEXT | YES | - | 송장번호 (UNIQUE) |
| pickup_address | TEXT | NO | - | 수거지 주소 |
| delivery_address | TEXT | NO | - | 배송지 주소 |
| notes | TEXT | YES | - | 요청사항 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 수정 시각 |

**인덱스:**
- `idx_orders_user_id` on `user_id`
- `idx_orders_tracking_no` on `tracking_no`
- `idx_orders_status` on `status`
- `idx_orders_created_at` on `created_at DESC`

**ENUM: order_status**
- `PENDING` - 결제 대기
- `PAID` - 결제 완료
- `BOOKED` - 수거예약 완료
- `INBOUND` - 입고 완료
- `PROCESSING` - 수선 중
- `READY_TO_SHIP` - 출고 완료
- `DELIVERED` - 배송 완료
- `CANCELLED` - 취소

---

### 3. shipments (송장/배송)

송장 및 배송 정보를 저장합니다. **tracking_no가 핵심 식별자**입니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| order_id | UUID | NO | - | 주문 ID (FK) |
| tracking_no | TEXT | NO | - | 송장번호 (UNIQUE) |
| carrier | carrier | NO | EPOST | 택배사 |
| status | shipment_status | NO | BOOKED | 배송 상태 |
| pickup_address | TEXT | NO | - | 수거지 |
| delivery_address | TEXT | NO | - | 배송지 |
| customer_name | TEXT | NO | - | 고객명 |
| inbound_video_id | UUID | YES | - | 입고 영상 ID |
| outbound_video_id | UUID | YES | - | 출고 영상 ID |
| tracking_events | JSONB | YES | [] | 배송 추적 이벤트 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 수정 시각 |

**인덱스:**
- `idx_shipments_tracking_no` on `tracking_no` (핵심!)
- `idx_shipments_order_id` on `order_id`
- `idx_shipments_status` on `status`

**ENUM: shipment_status**
- `BOOKED` - 수거예약 완료
- `PICKED_UP` - 수거 완료
- `IN_TRANSIT` - 배송 중
- `INBOUND` - 입고 완료
- `PROCESSING` - 수선 중
- `READY_TO_SHIP` - 출고 완료
- `OUT_FOR_DELIVERY` - 배송 중
- `DELIVERED` - 배송 완료

---

### 4. payments (결제)

결제 정보를 저장합니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| order_id | UUID | NO | - | 주문 ID (FK) |
| imp_uid | TEXT | NO | - | 아임포트 결제번호 |
| merchant_uid | TEXT | NO | - | 가맹점 주문번호 |
| amount | INTEGER | NO | - | 결제 금액 |
| payment_method | payment_method | NO | CARD | 결제 수단 |
| status | payment_status | NO | PENDING | 결제 상태 |
| buyer_name | TEXT | NO | - | 결제자명 |
| paid_at | TIMESTAMPTZ | YES | - | 결제 시각 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |

**인덱스:**
- `idx_payments_order_id` on `order_id`
- `idx_payments_imp_uid` on `imp_uid`
- `idx_payments_paid_at` on `paid_at DESC`

---

### 5. videos (영상)

입출고 영상 정보를 저장합니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| tracking_no | TEXT | NO | - | 송장번호 (FK) |
| video_type | video_type | NO | - | 영상 타입 |
| cloudflare_video_id | TEXT | NO | - | CF Stream ID |
| stream_url | TEXT | NO | - | HLS URL |
| thumbnail_url | TEXT | YES | - | 썸네일 URL |
| duration_seconds | INTEGER | YES | - | 영상 길이 |
| status | video_status | NO | UPLOADING | 영상 상태 |
| uploaded_at | TIMESTAMPTZ | NO | NOW() | 업로드 시각 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |

**인덱스:**
- `idx_videos_tracking_no` on `tracking_no`
- `idx_videos_cloudflare_id` on `cloudflare_video_id`
- `idx_videos_uploaded_at` on `uploaded_at DESC`

**ENUM: video_type**
- `INBOUND` - 입고 영상
- `OUTBOUND` - 출고 영상

---

### 6. notifications (알림)

사용자 알림을 저장합니다.

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | 기본 키 |
| user_id | UUID | NO | - | 사용자 ID (FK) |
| type | notification_type | NO | - | 알림 타입 |
| title | TEXT | NO | - | 제목 |
| body | TEXT | NO | - | 내용 |
| order_id | UUID | YES | - | 주문 ID |
| tracking_no | TEXT | YES | - | 송장번호 |
| data | JSONB | YES | {} | 추가 데이터 |
| is_read | BOOLEAN | NO | FALSE | 읽음 여부 |
| fcm_sent | BOOLEAN | NO | FALSE | FCM 전송 여부 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |

**인덱스:**
- `idx_notifications_user_id` on `user_id`
- `idx_notifications_is_read` on `is_read`
- `idx_notifications_created_at` on `created_at DESC`

---

## 🔑 관계 정의

### Foreign Keys

```sql
-- orders → users
orders.user_id REFERENCES users(id)

-- shipments → orders
shipments.order_id REFERENCES orders(id)
shipments.tracking_no REFERENCES orders(tracking_no)

-- payments → orders
payments.order_id REFERENCES orders(id)

-- videos → shipments
videos.tracking_no REFERENCES shipments(tracking_no)

-- notifications → users, orders
notifications.user_id REFERENCES users(id)
notifications.order_id REFERENCES orders(id)
```

### Cascade Rules

- `ON DELETE CASCADE`: 부모 삭제 시 자식도 삭제
  - users → orders
  - orders → shipments, payments
  - shipments → videos

- `ON DELETE SET NULL`: 부모 삭제 시 NULL 설정
  - orders → notifications

---

## 🔐 Row Level Security (RLS)

### 사용자 정책

```sql
-- 자신의 주문만 조회
CREATE POLICY "view_own_orders"
ON orders FOR SELECT
USING (user_id IN (
  SELECT id FROM users WHERE auth_id = auth.uid()
));
```

### 관리자 정책

```sql
-- 관리자는 모든 데이터 접근
CREATE POLICY "admin_all_access"
ON orders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
    AND email LIKE '%@admin.modusrepair.com'
  )
);
```

---

## 🔄 트리거

### updated_at 자동 갱신

```sql
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 영상 업로드 시 shipments 업데이트

```sql
CREATE TRIGGER on_video_insert
  AFTER INSERT ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_video();
```

---

## 📊 쿼리 예시

### 주문 + 송장 + 영상 조인

```sql
SELECT 
  o.*,
  s.tracking_no,
  s.status as shipment_status,
  v_in.stream_url as inbound_video_url,
  v_out.stream_url as outbound_video_url
FROM orders o
LEFT JOIN shipments s ON o.tracking_no = s.tracking_no
LEFT JOIN videos v_in ON s.tracking_no = v_in.tracking_no 
  AND v_in.video_type = 'INBOUND'
LEFT JOIN videos v_out ON s.tracking_no = v_out.tracking_no 
  AND v_out.video_type = 'OUTBOUND'
WHERE o.user_id = {user_id}
ORDER BY o.created_at DESC;
```

### 송장번호로 전체 정보 조회

```sql
SELECT 
  s.*,
  o.item_name,
  o.customer_name,
  ARRAY_AGG(v.*) as videos
FROM shipments s
INNER JOIN orders o ON s.order_id = o.id
LEFT JOIN videos v ON s.tracking_no = v.tracking_no
WHERE s.tracking_no = {tracking_no}
GROUP BY s.id, o.id;
```

---

## 🗂️ 인덱스 전략

### 조회 최적화

1. **tracking_no**: 모든 조회의 핵심
2. **user_id**: 사용자별 필터링
3. **status**: 상태별 필터링
4. **created_at**: 시간순 정렬

### Composite Index (향후 고려)

```sql
-- 사용자 + 상태로 자주 조회하는 경우
CREATE INDEX idx_orders_user_status 
ON orders(user_id, status);

-- 송장 + 영상 타입
CREATE INDEX idx_videos_tracking_type 
ON videos(tracking_no, video_type);
```

---

## 📈 성능 고려사항

### Partitioning (대용량 데이터 시)

```sql
-- 월별 파티셔닝
CREATE TABLE orders_2024_01 
  PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Materialized View (통계용)

```sql
-- 일별 주문 통계
CREATE MATERIALIZED VIEW daily_order_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as order_count,
  SUM(total_price) as total_revenue
FROM orders
GROUP BY DATE(created_at);
```

---

## 📚 참고 자료

- [PostgreSQL 문서](https://www.postgresql.org/docs/)
- [Supabase RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)

