# 모두의수선 - Edge Functions (Supabase)

Supabase Edge Functions로 구현한 백엔드 API

## 🎯 주요 API

### 수거예약 및 송장발급
- **POST** `/shipments-book`
- 우체국 API 연동
- 송장번호(`tracking_no`) 생성
- 기본 규격: 초소형 1kg / 세 변 합 50cm / `microYn=Y` (`EPOST_MICRO_PACKAGE`). 앱은 중량·크기를 안 넘김 → **스토어 새 빌드 불필요**
- **미수거 재접수:** `force_rebook: true` + `pickup_date` (YYYY-MM-DD). 기존 우체국 예약을 취소하고 새 송장을 발급. 주문·결제는 유지. 집하완료(`PICKED_UP`)면 거부. 사용자 JWT면 본인 주문만. 신청번호(`reqNo`)가 없으면 취소를 건너뛰고 새 접수.

### 출고 송장
- **POST** `/shipments-create-outbound`
- 같은 초소형 규격으로 우체국 일반소포 접수

### 결제 검증
- **POST** `/payments-verify`
- PortOne(아임포트) 결제 검증
- 결제 정보 저장

### 주문 취소 / 반송
- **POST** `/orders-cancel` · `/orders-return-and-refund`
- 환불 성공 시 `restore_order_points_used`로 사용 포인트 자동 복구 (`USE_RESTORE`)
- 전액 취소는 잔여 전액, 부분 취소는 취소 금액 비율. RPC `20260910000000_restore_points_partial.sql`

### 영상 업로드
- **POST** `/videos-upload`
- Cloudflare Stream 연동
- 입고/출고 영상 관리

## 🚀 시작하기

### 사전 요구사항
- Deno 1.40 이상
- Supabase CLI

### 설치

```bash
# Supabase CLI 설치
npm install -g supabase

# 또는
brew install supabase/tap/supabase
```

### 로컬 실행

```bash
# Supabase 로컬 시작
supabase start

# Edge Functions 실행
supabase functions serve

# 특정 함수만 실행
supabase functions serve shipments-book
```

### 환경 설정

Edge Functions는 Supabase 프로젝트의 환경변수를 사용합니다.

```bash
# 로컬 환경변수 설정
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set PORTONE_API_KEY=your-key
supabase secrets set EPOST_API_KEY=your-key
supabase secrets set CLOUDFLARE_API_TOKEN=your-token
```

## 📂 프로젝트 구조

```
apps/edge/
├── supabase/
│   ├── config.toml           # Supabase 설정
│   └── functions/            # Edge Functions
│       ├── _shared/          # 공통 유틸리티
│       │   ├── cors.ts       # CORS 설정
│       │   ├── supabase.ts   # Supabase 클라이언트
│       │   └── response.ts   # 응답 헬퍼
│       ├── shipments-book/   # 수거예약 API
│       ├── payments-verify/  # 결제 검증 API
│       └── videos-upload/    # 영상 업로드 API
└── README.md
```

## 📚 API 명세

### 1. 수거예약 (`/shipments-book`)

우체국 초소형 감액 계약. 중량·크기를 안 넘기면 **1kg / 50cm / `microYn=Y`**.

**Request:**
```json
{
  "order_id": "ORDER-2024-0001",
  "pickup_address": "서울시 강남구 테헤란로 123",
  "pickup_phone": "010-1234-5678",
  "delivery_address": "서울시 강남구 테헤란로 123",
  "delivery_phone": "010-1234-5678",
  "customer_name": "홍길동",
  "force_rebook": false,
  "pickup_date": "2026-09-14"
}
```

미수거 재접수 시 `force_rebook: true`. 기존 송장이 있어도 우체국 취소 후 다시 넣는다.

**Response:**
```json
{
  "tracking_no": "1234567890",
  "status": "BOOKED",
  "message": "수거예약이 완료되었습니다",
  "shipment": { ... }
}
```

### 2. 결제 검증 (`/payments-verify`)

**Request:**
```json
{
  "imp_uid": "imp_123456789",
  "merchant_uid": "order_123456789",
  "order_id": "ORDER-2024-0001"
}
```

**Response:**
```json
{
  "verified": true,
  "payment": { ... },
  "message": "결제가 완료되었습니다"
}
```

### 3. 영상 업로드 (`/videos-upload`)

**Request:**
```json
{
  "tracking_no": "1234567890",
  "video_type": "INBOUND",
  "video_url": "https://..."
}
```

**Response:**
```json
{
  "video_id": "VIDEO123",
  "stream_url": "https://stream.cloudflare.com/.../video.m3u8",
  "thumbnail_url": "https://stream.cloudflare.com/.../thumbnail.jpg",
  "video": { ... },
  "message": "영상이 업로드되었습니다"
}
```

## 🧪 테스트

### 로컬 테스트

```bash
# cURL로 테스트
curl -i --location --request POST 'http://localhost:54321/functions/v1/shipments-book' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"order_id":"test","pickup_address":"Seoul"}'

# 또는 httpie
http POST http://localhost:54321/functions/v1/shipments-book \
  Authorization:"Bearer YOUR_ANON_KEY" \
  order_id=test \
  pickup_address=Seoul
```

## 📦 배포

### Supabase Cloud 배포

```bash
# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 함수 배포
supabase functions deploy shipments-book
supabase functions deploy payments-verify
supabase functions deploy videos-upload

# 전체 배포
supabase functions deploy
```

### 환경변수 설정 (Production)

```bash
supabase secrets set --project-ref your-project-ref \
  PORTONE_API_KEY=prod-key \
  EPOST_API_KEY=prod-key \
  CLOUDFLARE_API_TOKEN=prod-token
```

## 🔐 보안

### 인증
모든 Edge Functions는 Supabase Auth를 통한 인증이 필요합니다.

```typescript
// 클라이언트에서 호출
const { data, error } = await supabase.functions.invoke('shipments-book', {
  body: { order_id: '...' },
});
```

### CORS
모든 함수는 CORS 헤더를 포함하며, `_shared/cors.ts`에서 관리됩니다.

### Rate Limiting
Supabase가 자동으로 Rate Limiting을 적용합니다.

## 🌐 외부 API 연동

### 우체국 API
- 수거예약: `/api/collect/book`
- 송장추적: `/api/tracking/{tracking_no}`

### PortOne (아임포트)
- 결제 검증: `/payments/verify`
- 결제 취소: `/payments/cancel`

### Cloudflare Stream
- 영상 업로드: `/stream`
- 영상 조회: `/stream/{video_id}`

## 📊 로깅 및 모니터링

### 로그 확인

```bash
# 실시간 로그
supabase functions logs shipments-book --tail

# 특정 기간 로그
supabase functions logs shipments-book --since 1h
```

### Supabase Dashboard
- Edge Functions 탭에서 실시간 모니터링
- 요청/응답 통계
- 에러 추적

## 🤝 기여

1. Feature 브랜치 생성
2. Edge Function 추가
3. 테스트 작성
4. Pull Request 생성

## 📚 참고 자료

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Deno 문서](https://deno.land/manual)
- [우체국 택배 API](https://www.epost.go.kr)
- [PortOne 문서](https://portone.io/docs)
- [Cloudflare Stream 문서](https://developers.cloudflare.com/stream)

## 라이선스

Private Project

