# Flutter 앱 고객 이벤트 추적 통합 체크리스트

## ✅ 준비 단계

### 1. 의존성 추가

`pubspec.yaml`에 다음을 추가:

```yaml
dependencies:
  device_info_plus: ^9.0.0
  package_info_plus: ^4.0.0
```

설치:
```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter pub get
```

### 2. 서비스 파일 확인

이미 생성된 파일: `/Users/jangjihoon/modo/apps/mobile/lib/services/customer_event_service.dart`

---

## 📱 필수 통합 포인트

### 1. 앱 시작 (main.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(/* ... */);
  
  // 디바이스 정보 초기화
  await CustomerEventService.initializeDeviceInfo();
  
  // 앱 실행 이벤트
  await CustomerEventService.trackAppOpen();
  
  runApp(MyApp());
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/main.dart`

---

### 2. 장바구니 (cart_provider.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 장바구니 추가
Future<void> addToCart(RepairItem item) async {
  // 기존 로직...
  
  // 이벤트 추적
  await CustomerEventService.trackCartAdd(
    itemName: item.name,
    targetId: item.id,
    quantity: 1,
    price: item.price,
  );
}

// 장바구니 삭제
Future<void> removeFromCart(String itemId) async {
  // 기존 로직...
  
  // 이벤트 추적
  await CustomerEventService.trackCartRemove(
    itemName: '상품명',
    targetId: itemId,
  );
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/providers/cart_provider.dart`

---

### 3. 주문 생성 (create_order_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 주문 시작 시
@override
void initState() {
  super.initState();
  
  CustomerEventService.trackOrderStart(
    totalAmount: calculateTotal(),
    itemCount: cartItems.length,
  );
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/create_order_page.dart`

---

### 4. 결제 (payment_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 결제 시도
Future<void> startPayment() async {
  // 결제 시도 이벤트
  await CustomerEventService.trackPaymentStart(
    orderId: widget.orderId,
    amount: widget.amount,
    paymentMethod: selectedPaymentMethod,
  );
  
  try {
    // 결제 처리...
    final result = await processPayment();
    
    if (result.success) {
      // 결제 성공 이벤트
      await CustomerEventService.trackPaymentSuccess(
        orderId: widget.orderId,
        amount: widget.amount,
        transactionId: result.transactionId,
      );
    }
  } catch (e) {
    // 결제 실패 이벤트
    await CustomerEventService.trackPaymentFail(
      orderId: widget.orderId,
      amount: widget.amount,
      errorMessage: e.toString(),
    );
  }
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/payment_page.dart`

---

### 5. 수거 신청 (pickup_request_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 수거 신청 시작
@override
void initState() {
  super.initState();
  CustomerEventService.trackPickupRequestStart();
}

// 수거 신청 완료
Future<void> submitPickupRequest() async {
  // 기존 로직...
  
  await CustomerEventService.trackPickupRequestComplete(
    orderId: orderId,
  );
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/pickup_request_page.dart`

---

### 6. 페이지 뷰 (모든 주요 페이지)

각 페이지의 `initState()`에 추가:

```dart
import 'package:modo/services/customer_event_service.dart';

@override
void initState() {
  super.initState();
  
  CustomerEventService.trackPageView(
    pageTitle: '페이지 이름',
    pageUrl: '/route/path',
  );
}
```

**주요 페이지들**:
- `home_page.dart`
- `order_detail_page.dart`
- `order_list_page.dart`
- `profile_page.dart`

---

### 7. 수선 메뉴 조회 (select_repair_type_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 수선 타입 선택 시
Future<void> onRepairTypeSelected(RepairType repairType) async {
  await CustomerEventService.trackRepairMenuView(
    menuName: repairType.name,
    menuId: repairType.id,
  );
  
  // 기존 로직...
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/select_repair_type_page.dart`

---

### 8. 이미지 업로드 (image_annotation_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 업로드 시작
Future<void> startImageUpload() async {
  await CustomerEventService.trackImageUploadStart(
    orderId: widget.orderId,
  );
  
  // 업로드 로직...
}

// 업로드 완료
Future<void> onUploadComplete(List<String> imageIds) async {
  await CustomerEventService.trackImageUploadComplete(
    orderId: widget.orderId,
    imageCount: imageIds.length,
  );
}

// 핀 추가
Future<void> onPinAdded(String imageId) async {
  await CustomerEventService.trackPinAdd(
    orderId: widget.orderId,
    imageId: imageId,
  );
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/image_annotation_page.dart`

---

### 9. 추가금 관련 (pending_extra_charges_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 추가금 확인
@override
void initState() {
  super.initState();
  
  CustomerEventService.trackExtraChargeView(
    orderId: widget.orderId,
    amount: widget.extraCharge.price,
  );
}

// 추가금 승인
Future<void> acceptExtraCharge() async {
  await CustomerEventService.trackExtraChargeAccept(
    orderId: widget.orderId,
    amount: widget.extraCharge.price,
  );
  
  // 기존 로직...
}

// 추가금 거부
Future<void> rejectExtraCharge(String reason) async {
  await CustomerEventService.trackExtraChargeReject(
    orderId: widget.orderId,
    amount: widget.extraCharge.price,
    reason: reason,
  );
  
  // 기존 로직...
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/orders/presentation/pages/pending_extra_charges_page.dart`

---

### 10. 배너 클릭 (home_page.dart)

```dart
import 'package:modo/services/customer_event_service.dart';

// 배너 클릭 시
Future<void> onBannerTap(Banner banner) async {
  await CustomerEventService.trackBannerClick(
    bannerId: banner.id,
    bannerTitle: banner.title,
  );
  
  // 배너 링크로 이동...
}
```

**파일**: `/Users/jangjihoon/modo/apps/mobile/lib/features/home/presentation/pages/home_page.dart`

---

## 🧪 테스트 방법

### 1. 로컬 테스트

```bash
cd /Users/jangjihoon/modo/apps/mobile
flutter run
```

### 2. 이벤트 확인

앱에서 다음 액션을 수행하고 대시보드에서 확인:

1. ✅ 앱 실행
2. ✅ 장바구니에 상품 추가
3. ✅ 주문 시작
4. ✅ 결제 시도
5. ✅ (테스트용으로 결제 실패도 테스트)

### 3. 대시보드 확인

`/dashboard/analytics/customer-behavior`에서 실시간으로 이벤트 확인

---

## 📊 예상 결과

통합 완료 후 대시보드에서 다음을 확인할 수 있습니다:

- 📈 총 이벤트 수
- 👥 활성 사용자 수
- 🛒 장바구니 추가/삭제 통계
- 💳 주문 전환율
- 📉 이탈 지점 분석
- 🔄 퍼널 분석

---

## ⚠️ 주의사항

1. **에러 처리**: 이벤트 기록 실패가 앱 기능에 영향을 주지 않도록 이미 try-catch 처리됨
2. **개인정보**: 민감한 정보는 metadata에 저장하지 않기
3. **성능**: 과도한 이벤트 기록 지양

---

## 📚 참고 문서

- **전체 가이드**: `/Users/jangjihoon/modo/CUSTOMER_BEHAVIOR_ANALYTICS_GUIDE.md`
- **서비스 파일**: `/Users/jangjihoon/modo/apps/mobile/lib/services/customer_event_service.dart`
- **API 문서**: `/Users/jangjihoon/modo/apps/admin/app/api/analytics/customer-behavior/route.ts`

---

**작성일**: 2024-12-18  
**버전**: 1.0.0

