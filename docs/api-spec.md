# 모두의수선 - API 명세

## 🌐 Base URL

### Development
```
https://{project-id}.supabase.co/functions/v1
```

### Production
```
https://api.modorepair.com/v1
```

## 🔐 인증

모든 API는 Supabase Auth JWT 토큰이 필요합니다.

```http
Authorization: Bearer {JWT_TOKEN}
```

## 📡 API 엔드포인트

---

## 1. 수거예약 및 송장발급

### POST `/shipments-book`

수거예약을 생성하고 우체국 송장번호를 발급합니다.

**Request:**
```http
POST /shipments-book
Authorization: Bearer {token}
Content-Type: application/json

{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "pickup_address": "서울시 강남구 테헤란로 123",
  "pickup_address_detail": "ABC빌딩 10층",
  "pickup_zipcode": "06234",
  "pickup_phone": "010-1234-5678",
  "delivery_address": "서울시 강남구 테헤란로 456",
  "delivery_address_detail": "XYZ아파트 101동 1001호",
  "delivery_zipcode": "06235",
  "delivery_phone": "010-9876-5432",
  "customer_name": "홍길동",
  "force_rebook": false,
  "pickup_date": "2026-09-14"
}
```

송화인 부재 등 미수거 재접수는 `force_rebook: true`와 새 `pickup_date`를 넣는다. 주문·결제는 유지하고 기존 송장만 취소한 뒤 새 송장을 발급한다. 집하완료면 `ALREADY_PICKED_UP`.

**Response (201 Created):**
```json
{
  "tracking_no": "1234567890123",
  "status": "BOOKED",
  "message": "수거예약이 완료되었습니다",
  "shipment": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "tracking_no": "1234567890123",
    "carrier": "EPOST",
    "status": "BOOKED",
    "pickup_address": "서울시 강남구 테헤란로 123",
    "delivery_address": "서울시 강남구 테헤란로 456",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Missing required fields"
}

// 404 Not Found
{
  "error": "Order not found"
}

// 500 Internal Server Error
{
  "error": "Failed to create shipment"
}
```

---

## 2. 결제 검증

### POST `/payments-verify`

PortOne(아임포트) 결제를 검증하고 주문 상태를 업데이트합니다.

**Request:**
```http
POST /payments-verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "imp_uid": "imp_123456789",
  "merchant_uid": "order_1234567890",
  "order_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "verified": true,
  "payment": {
    "id": "750e8400-e29b-41d4-a716-446655440000",
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "imp_uid": "imp_123456789",
    "merchant_uid": "order_1234567890",
    "amount": 15000,
    "payment_method": "CARD",
    "status": "PAID",
    "paid_at": "2024-01-15T10:25:00Z"
  },
  "message": "결제가 완료되었습니다"
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Payment verification failed"
}

// 404 Not Found
{
  "error": "Order not found"
}
```

---

## 3. 영상 업로드

### POST `/videos-upload`

Cloudflare Stream에 입고/출고 영상을 업로드합니다.

**Request:**
```http
POST /videos-upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "tracking_no": "1234567890123",
  "video_type": "INBOUND",
  "video_url": "https://example.com/video.mp4"
}
```

**Response (201 Created):**
```json
{
  "video_id": "5d5bc37ffcf54c9b82e996823bffbb81",
  "stream_url": "https://customer-subdomain.cloudflarestream.com/5d5bc37ffcf54c9b82e996823bffbb81/manifest/video.m3u8",
  "thumbnail_url": "https://customer-subdomain.cloudflarestream.com/5d5bc37ffcf54c9b82e996823bffbb81/thumbnails/thumbnail.jpg",
  "video": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "tracking_no": "1234567890123",
    "video_type": "INBOUND",
    "cloudflare_video_id": "5d5bc37ffcf54c9b82e996823bffbb81",
    "stream_url": "https://...",
    "status": "READY",
    "uploaded_at": "2024-01-15T11:00:00Z"
  },
  "message": "영상이 업로드되었습니다"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tracking_no | string | ✅ | 송장번호 |
| video_type | enum | ✅ | `INBOUND` 또는 `OUTBOUND` |
| video_url | string | ❌ | 비디오 URL (선택) |

---

## 📊 Supabase Database API

Supabase JS SDK를 통해 직접 DB에 접근할 수 있습니다.

### 주문 조회

```typescript
// 내 주문 목록
const { data: orders, error } = await supabase
  .from('orders')
  .select('*')
  .order('created_at', { ascending: false });

// 특정 주문 상세
const { data: order, error } = await supabase
  .from('orders')
  .select(`
    *,
    shipments (*),
    payments (*),
    videos (*)
  `)
  .eq('id', orderId)
  .single();
```

### 송장 추적

```typescript
const { data: shipment, error } = await supabase
  .from('shipments')
  .select(`
    *,
    orders (*),
    videos (*)
  `)
  .eq('tracking_no', trackingNo)
  .single();
```

### 알림 조회

```typescript
const { data: notifications, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

### Realtime 구독

```typescript
// 주문 상태 변경 실시간 구독
const subscription = supabase
  .channel('orders')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`
    },
    (payload) => {
      console.log('Order updated:', payload.new);
    }
  )
  .subscribe();
```

---

## 🔔 푸시 알림

### FCM 메시지 포맷

```json
{
  "notification": {
    "title": "입고 완료",
    "body": "고객님의 의류가 입고되었습니다. 영상을 확인해보세요."
  },
  "data": {
    "type": "INBOUND_COMPLETED",
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "tracking_no": "1234567890123",
    "video_url": "https://..."
  }
}
```

### 알림 타입

| Type | Title | 설명 |
|------|-------|------|
| ORDER_CREATED | 주문 생성 | 주문이 생성됨 |
| PAYMENT_COMPLETED | 결제 완료 | 결제가 완료됨 |
| SHIPMENT_BOOKED | 수거예약 완료 | 수거가 예약됨 |
| INBOUND_COMPLETED | 입고 완료 | 입고가 완료됨 |
| INBOUND_VIDEO | 입고 영상 | 입고 영상 업로드 |
| PROCESSING | 수선 시작 | 수선이 시작됨 |
| OUTBOUND_COMPLETED | 출고 완료 | 출고가 완료됨 |
| OUTBOUND_VIDEO | 출고 영상 | 출고 영상 업로드 |
| DELIVERY_STARTED | 배송 시작 | 배송이 시작됨 |
| DELIVERED | 배송 완료 | 배송이 완료됨 |

---

## 🌍 외부 API 연동

### 우체국 택배 API

#### 수거예약
```http
POST https://service.epost.go.kr/api/collect/book
Authorization: Bearer {EPOST_API_KEY}

{
  "customer_id": "...",
  "pickup_address": "...",
  "delivery_address": "...",
  "weight": 1.5,
  "box_count": 1
}
```

#### 배송 추적
```http
GET https://service.epost.go.kr/api/tracking/{tracking_no}
Authorization: Bearer {EPOST_API_KEY}
```

### PortOne (아임포트)

#### 결제 검증
```http
POST https://api.iamport.kr/payments/verify
Authorization: Bearer {ACCESS_TOKEN}

{
  "imp_uid": "imp_123456789",
  "merchant_uid": "order_1234567890",
  "amount": 15000
}
```

### Cloudflare Stream

#### Direct Creator Upload
```http
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/direct_upload
Authorization: Bearer {CLOUDFLARE_API_TOKEN}

{
  "maxDurationSeconds": 3600,
  "requireSignedURLs": false
}
```

---

## 📝 HTTP 상태 코드

| Code | Description |
|------|-------------|
| 200 | OK - 요청 성공 |
| 201 | Created - 리소스 생성 성공 |
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 실패 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 500 | Internal Server Error - 서버 에러 |

---

## 🧪 테스트

### cURL 예시

```bash
# 수거예약
curl -X POST https://your-project.supabase.co/functions/v1/shipments-book \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "pickup_address": "서울시 강남구",
    "delivery_address": "서울시 강남구",
    "customer_name": "홍길동"
  }'
```

### JavaScript/TypeScript

```typescript
// Supabase Edge Function 호출
const { data, error } = await supabase.functions.invoke('shipments-book', {
  body: {
    order_id: orderId,
    pickup_address: pickupAddress,
    delivery_address: deliveryAddress,
    customer_name: customerName,
  },
});
```

---

## 🔒 Rate Limiting

- 인증된 요청: 100 req/min
- 비인증 요청: 10 req/min
- 영상 업로드: 10 req/hour

---

## 📚 참고 자료

- [Supabase Docs](https://supabase.com/docs)
- [PortOne API](https://portone.io/docs)
- [우체국 택배 API](https://www.epost.go.kr)
- [Cloudflare Stream API](https://developers.cloudflare.com/stream/api)

