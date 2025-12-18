# 고객 행동 분석 시스템 가이드

## 📌 개요

고객의 모든 행동을 추적하고 분석하는 시스템입니다.

### 주요 기능
- ✅ 고객 액션 추적 (장바구니, 결제, 수거 신청 등)
- ✅ 퍼널 분석 (전환율 분석)
- ✅ 이탈 지점 분석
- ✅ 실시간 통계 대시보드
- ✅ 모바일 앱 완전 통합

---

## 🗄️ 데이터베이스 설정

### 1. 마이그레이션 실행

```bash
# Supabase 프로젝트 루트에서
cd supabase
supabase db push

# 또는 Supabase Dashboard > SQL Editor에서 직접 실행
```

마이그레이션 파일: `supabase/migrations/20251218000002_create_customer_events.sql`

### 2. 생성되는 테이블

**`customer_events` 테이블**

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `event_id` | UUID | 이벤트 고유 ID |
| `user_id` | UUID | 사용자 ID (로그인 사용자) |
| `session_id` | TEXT | 세션 ID (비로그인 사용자 추적) |
| `event_type` | ENUM | 이벤트 타입 |
| `event_name` | TEXT | 이벤트 이름 |
| `page_url` | TEXT | 페이지 URL |
| `page_title` | TEXT | 페이지 제목 |
| `target_id` | TEXT | 대상 ID (주문 ID 등) |
| `target_type` | TEXT | 대상 타입 |
| `metadata` | JSONB | 추가 정보 |
| `device_type` | TEXT | 디바이스 타입 |
| `device_os` | TEXT | 운영체제 |
| `device_model` | TEXT | 디바이스 모델 |
| `app_version` | TEXT | 앱 버전 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

### 3. 이벤트 타입 (34가지)

#### 장바구니 관련
- `CART_ADD` - 장바구니 추가
- `CART_REMOVE` - 장바구니 삭제
- `CART_UPDATE` - 장바구니 수량 변경
- `CART_CLEAR` - 장바구니 비우기

#### 주문 관련
- `ORDER_START` - 주문 시작
- `ORDER_INFO_FILL` - 주문 정보 입력 완료
- `ORDER_ADDRESS_FILL` - 배송지 입력 완료
- `ORDER_PAYMENT_START` - 결제 시작
- `ORDER_PAYMENT_SUCCESS` - 결제 성공
- `ORDER_PAYMENT_FAIL` - 결제 실패
- `ORDER_COMPLETE` - 주문 완료

#### 수거 신청 관련
- `PICKUP_REQUEST_START` - 수거 신청 시작
- `PICKUP_REQUEST_COMPLETE` - 수거 신청 완료
- `PICKUP_REQUEST_CANCEL` - 수거 신청 취소

#### 페이지 뷰
- `PAGE_VIEW` - 페이지 조회
- `PRODUCT_VIEW` - 상품 상세 조회
- `REPAIR_MENU_VIEW` - 수선 메뉴 조회

#### 이미지 업로드
- `IMAGE_UPLOAD_START` - 이미지 업로드 시작
- `IMAGE_UPLOAD_COMPLETE` - 이미지 업로드 완료
- `PIN_ADD` - 핀 추가
- `PIN_REMOVE` - 핀 삭제

#### 추가금 관련
- `EXTRA_CHARGE_VIEW` - 추가금 확인
- `EXTRA_CHARGE_ACCEPT` - 추가금 승인
- `EXTRA_CHARGE_REJECT` - 추가금 거부

#### 기타
- `APP_OPEN` - 앱 실행
- `APP_CLOSE` - 앱 종료
- `SEARCH` - 검색
- `FILTER_APPLY` - 필터 적용
- `BANNER_CLICK` - 배너 클릭
- `NOTIFICATION_CLICK` - 알림 클릭

---

## 📱 Flutter 모바일 앱 통합

### 1. 서비스 Import

```dart
import 'package:your_app/services/customer_event_service.dart';
```

### 2. 앱 시작 시 초기화

```dart
// main.dart 또는 splash_page.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Supabase 초기화
  await Supabase.initialize(/* ... */);
  
  // 디바이스 정보 초기화
  await CustomerEventService.initializeDeviceInfo();
  
  // 앱 실행 이벤트
  await CustomerEventService.trackAppOpen();
  
  runApp(MyApp());
}
```

### 3. 사용 예시

#### 장바구니 추가
```dart
// cart_provider.dart 또는 cart_page.dart
await CustomerEventService.trackCartAdd(
  itemName: '지퍼 수선',
  targetId: repairItem.id,
  quantity: 1,
  price: 5000,
);
```

#### 주문 시작
```dart
// create_order_page.dart
await CustomerEventService.trackOrderStart(
  orderId: orderId,
  totalAmount: 15000,
  itemCount: 3,
);
```

#### 결제 시도
```dart
// payment_page.dart
await CustomerEventService.trackPaymentStart(
  orderId: orderId,
  amount: 15000,
  paymentMethod: '카드',
);
```

#### 결제 성공
```dart
// payment_page.dart - 결제 성공 콜백
await CustomerEventService.trackPaymentSuccess(
  orderId: orderId,
  amount: 15000,
  transactionId: transactionId,
);
```

#### 결제 실패
```dart
// payment_page.dart - 결제 실패 콜백
await CustomerEventService.trackPaymentFail(
  orderId: orderId,
  amount: 15000,
  errorMessage: error.toString(),
);
```

#### 페이지 뷰
```dart
// 각 페이지의 initState()
@override
void initState() {
  super.initState();
  CustomerEventService.trackPageView(
    pageTitle: '주문 상세',
    pageUrl: '/orders/${widget.orderId}',
  );
}
```

#### 수선 메뉴 조회
```dart
// select_repair_type_page.dart
await CustomerEventService.trackRepairMenuView(
  menuName: '지퍼 수선',
  menuId: repairType.id,
);
```

#### 추가금 확인
```dart
// pending_extra_charges_page.dart
await CustomerEventService.trackExtraChargeView(
  orderId: orderId,
  amount: extraCharge.price,
);
```

#### 추가금 승인
```dart
await CustomerEventService.trackExtraChargeAccept(
  orderId: orderId,
  amount: extraCharge.price,
);
```

#### 배너 클릭
```dart
// home_page.dart
await CustomerEventService.trackBannerClick(
  bannerId: banner.id,
  bannerTitle: banner.title,
);
```

---

## 💻 관리자 대시보드 (Next.js)

### 1. 대시보드 접속

```
URL: /dashboard/analytics/customer-behavior
```

### 2. 주요 기능

#### 개요 통계
- 총 이벤트 수
- 활성 사용자 수
- 장바구니 추가/삭제 통계
- 주문 전환율

#### 퍼널 분석
- 각 단계별 고객 수
- 단계별 전환율
- 단계별 이탈률
- 시각화된 퍼널 차트

#### 이탈 지점 분석
- 주요 이탈 지점 TOP 10
- 이탈률 퍼센트
- 세션별 분석

#### 주문 흐름 분석
- 주문 시작 → 결제 시도 → 결제 완료
- 각 단계별 전환율
- 결제 실패 분석

### 3. API 엔드포인트

```typescript
// 개요 통계
GET /api/analytics/customer-behavior?type=overview&startDate=2024-01-01&endDate=2024-12-31

// 퍼널 분석
GET /api/analytics/customer-behavior?type=funnel&startDate=2024-01-01&endDate=2024-12-31

// 이탈 지점 분석
GET /api/analytics/customer-behavior?type=dropoff&startDate=2024-01-01&endDate=2024-12-31

// 특정 사용자 이벤트
GET /api/analytics/customer-behavior?type=user&userId=xxx

// 이벤트 기록 (POST)
POST /api/analytics/customer-behavior
Body: {
  "event_type": "CART_ADD",
  "event_name": "지퍼 수선",
  "target_id": "item-123",
  "metadata": { "price": 5000 }
}
```

---

## 🔧 통합 체크리스트

### Flutter 앱

- [ ] `customer_event_service.dart` 추가
- [ ] `pubspec.yaml`에 의존성 추가
  ```yaml
  dependencies:
    device_info_plus: ^9.0.0
    package_info_plus: ^4.0.0
  ```
- [ ] `main.dart`에서 초기화
- [ ] 장바구니 추가/삭제 이벤트 통합
- [ ] 주문 시작 이벤트 통합
- [ ] 결제 시도/성공/실패 이벤트 통합
- [ ] 페이지 뷰 이벤트 통합
- [ ] 수거 신청 이벤트 통합
- [ ] 추가금 관련 이벤트 통합
- [ ] 배너 클릭 이벤트 통합

### 관리자 대시보드

- [x] 데이터베이스 마이그레이션 실행
- [x] API 엔드포인트 생성
- [x] 대시보드 UI 생성
- [x] 사이드바 메뉴 추가
- [x] 퍼널 분석 기능
- [x] 이탈 분석 기능

---

## 📊 분석 활용 방법

### 1. 퍼널 분석으로 전환율 개선
```
앱 실행 (100명)
  ↓ 전환율: 70%
상품 조회 (70명)
  ↓ 전환율: 50%
장바구니 추가 (35명)
  ↓ 전환율: 60%
주문 시작 (21명)
  ↓ 전환율: 80%
결제 시도 (17명)
  ↓ 전환율: 90%
결제 완료 (15명)
```

**개선 포인트**: 장바구니 추가 → 주문 시작 단계에서 가장 큰 이탈 발생 (50%)

### 2. 이탈 지점 분석으로 문제점 파악
- **장바구니 추가 후 이탈 40%** → 가격이 부담스러운지?
- **결제 시작 후 이탈 20%** → 결제 프로세스가 복잡한지?
- **추가금 확인 후 이탈 15%** → 추가금이 예상보다 높은지?

### 3. A/B 테스트
```dart
// 버전 A: 기존 UI
await CustomerEventService.trackEvent(
  eventType: CustomerEventType.PAGE_VIEW,
  metadata: {'ab_test_version': 'A'},
);

// 버전 B: 새로운 UI
await CustomerEventService.trackEvent(
  eventType: CustomerEventType.PAGE_VIEW,
  metadata: {'ab_test_version': 'B'},
);
```

### 4. 코호트 분석
```sql
-- 날짜별 신규 사용자의 전환율
SELECT 
  DATE(first_event.created_at) as cohort_date,
  COUNT(DISTINCT first_event.user_id) as users,
  COUNT(DISTINCT payment.user_id) as converted_users,
  ROUND(100.0 * COUNT(DISTINCT payment.user_id) / COUNT(DISTINCT first_event.user_id), 2) as conversion_rate
FROM customer_events first_event
LEFT JOIN customer_events payment 
  ON first_event.user_id = payment.user_id 
  AND payment.event_type = 'ORDER_PAYMENT_SUCCESS'
WHERE first_event.event_type = 'APP_OPEN'
GROUP BY DATE(first_event.created_at)
ORDER BY cohort_date DESC;
```

---

## 🔍 SQL 쿼리 예시

### 장바구니 담았다가 지운 고객
```sql
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE event_type = 'CART_ADD') as cart_adds,
  COUNT(*) FILTER (WHERE event_type = 'CART_REMOVE') as cart_removes,
  COUNT(*) FILTER (WHERE event_type = 'CART_ADD') - 
  COUNT(*) FILTER (WHERE event_type = 'CART_REMOVE') as net_adds
FROM customer_events
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE event_type = 'CART_REMOVE') > 0
ORDER BY cart_removes DESC;
```

### 결제 시도했다가 실패한 고객
```sql
SELECT 
  user_id,
  target_id as order_id,
  metadata->>'amount' as amount,
  metadata->>'error_message' as error,
  created_at
FROM customer_events
WHERE event_type = 'ORDER_PAYMENT_FAIL'
ORDER BY created_at DESC;
```

### 시간대별 활동 패턴
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  event_type,
  COUNT(*) as count
FROM customer_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at), event_type
ORDER BY hour, count DESC;
```

### 디바이스별 전환율
```sql
SELECT 
  device_type,
  device_os,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_START') as order_starts,
  COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') as payments,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'ORDER_PAYMENT_SUCCESS') / 
    NULLIF(COUNT(*) FILTER (WHERE event_type = 'ORDER_START'), 0),
    2
  ) as conversion_rate
FROM customer_events
GROUP BY device_type, device_os
ORDER BY payments DESC;
```

---

## 🚨 주의사항

### 개인정보 보호
- ❌ 민감한 정보 (비밀번호, 결제 정보)는 metadata에 저장하지 마세요
- ✅ 필요한 최소한의 정보만 수집하세요
- ✅ GDPR 및 개인정보보호법 준수

### 성능 최적화
- ✅ 이벤트 기록 실패 시 앱 기능에 영향을 주지 않도록 try-catch 사용
- ✅ 과도한 이벤트 기록은 피하기 (예: 1초에 10번 이상)
- ✅ 중요한 이벤트만 선별적으로 기록

### 데이터 보관
```sql
-- 1년 이상 된 이벤트 삭제 (선택적)
DELETE FROM customer_events
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 📚 참고 자료

### 파일 위치
- **마이그레이션**: `/supabase/migrations/20251218000002_create_customer_events.sql`
- **API**: `/apps/admin/app/api/analytics/customer-behavior/route.ts`
- **대시보드 UI**: `/apps/admin/app/dashboard/analytics/customer-behavior/page.tsx`
- **Flutter 서비스**: `/apps/mobile/lib/services/customer_event_service.dart`

### 관련 문서
- [Supabase RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)
- [Flutter Analytics Best Practices](https://docs.flutter.dev/cookbook/plugins/firebase-analytics)

---

## 💡 문의 및 지원

문제가 발생하거나 새로운 기능이 필요한 경우:
1. GitHub Issues 생성
2. 개발팀에 문의
3. 문서 업데이트 제안

---

**마지막 업데이트**: 2024-12-18  
**작성자**: AI Assistant  
**버전**: 1.0.0

