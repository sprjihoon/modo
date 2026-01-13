# 🚨 우체국 수거지 주소 매핑 문제 해결

## 📋 문제 발견!

송장번호는 받지만 수거원이 오지 않는 이유:
→ **수거지 주소(`pickupInfo`)가 우체국 API에 제대로 전달되지 않음**

## 🔍 주소 매핑 구조 (반품소포)

### 현재 코드 (shipments-book/index.ts)

```typescript
// 라인 461-467: 반품소포 필드 매핑
// ord* = 센터 (도착지, 받는 사람) ← deliveryInfo
// rec* = 고객 (출발지, 보내는 사람) ← pickupInfo ⚠️ 수거지!

const epostParams = {
  // 센터 주소 (도착지)
  ordNm: "모두의수선",
  ordAddr1: deliveryInfo.address,      // 센터 주소
  ordZip: deliveryInfo.zipcode,
  
  // 고객 주소 (수거지) ⚠️ 여기가 핵심!
  recNm: customer_name,
  recAddr1: pickupInfo.address,        // ⚠️ 수거지 주소
  recZip: pickupInfo.zipcode,
  recTel: pickupInfo.phone,
};
```

**우체국 수거원은 `recAddr1` (수거지)로 가야 합니다!**

## ⚡ 즉시 확인 방법

### 1단계: 최근 로그 확인
```bash
supabase functions logs shipments-book --limit 5
```

다음 로그를 찾으세요:

```
🐛 [DEBUG] 수거 라벨 (반품소포) - 고객→센터
   📥 ord* = 센터 (도착지, 받는 사람): 모두의수선 / 대구광역시 동구 동촌로 1 (41142)
   📤 rec* = 고객 (출발지, 보내는 사람): [고객이름] / [고객주소] ([우편번호])
```

**확인 사항:**
- ✅ `rec* = 고객`에 **실제 고객 수거 주소**가 있어야 함
- ❌ `rec* = 고객`에 **센터 주소**가 있으면 → 문제!
- ❌ `recAddr1`이 `"고객 수거지 주소"` (기본값)이면 → 주소 누락!

### 2단계: 주소 정보 확인 로그
```
🔍 주소 정보 (처리 전):
  pickupInfo_address: "실제 고객 주소"      ✅ 이게 있어야 함
  pickupInfo_zipcode: "12345"
  deliveryInfo_address: "대구광역시..."    ✅ 센터 주소
```

**문제 진단:**
- `pickupInfo_address`가 비어있거나 `"고객 수거지 주소 미입력"` → **주소 누락 문제**
- `pickupInfo_address`가 센터 주소와 같음 → **주소 중복 문제**

## 🔥 가능한 원인 3가지

### 원인 1: Flutter 앱에서 pickup_address_id 전달 안됨 (90%)

**확인:**
```dart
// apps/mobile/lib/features/orders/data/order_service.dart

Future<Map<String, dynamic>> bookShipment({
  required String orderId,
  String? pickupAddressId,  // ⚠️ 이게 전달되는지 확인
  ...
}) async {
  final response = await _dio.post(
    '/shipments-book',
    data: {
      'order_id': orderId,
      'pickup_address_id': pickupAddressId,  // ⚠️ 이게 null이면 문제!
      ...
    },
  );
}
```

**해결:**
Flutter 앱에서 실제 `pickup_address_id`를 전달하도록 수정

### 원인 2: DB에 수거지 주소가 없음 (5%)

**확인:**
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  id,
  order_number,
  pickup_address,
  pickup_zipcode,
  pickup_phone,
  delivery_address
FROM orders
WHERE order_number = '[최근 주문번호]';
```

**해결:**
- `pickup_address`가 NULL이면 → 주문 생성 시 수거지 주소 저장 로직 추가 필요

### 원인 3: addresses 테이블에서 조회 실패 (5%)

**확인:**
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  id,
  user_id,
  address,
  zipcode,
  recipient_phone
FROM addresses
WHERE id = '[pickup_address_id]';
```

**해결:**
- addresses 테이블에 데이터가 없으면 → 사용자 주소 등록 필요

## ✅ 해결 방법

### 방법 1: 로그에서 실제 주소 확인 (즉시)

```bash
# 실시간 로그 확인
supabase functions logs shipments-book --follow

# 수거 신청 시 다음을 확인:
# 1. pickupInfo_address에 실제 주소가 있는지
# 2. recAddr1에 고객 주소가 올바르게 전달되는지
# 3. ord*와 rec*의 주소가 다른지 (같으면 안됨)
```

### 방법 2: 테스트 수거 신청 (10분)

1. **Flutter 앱에서 수거 신청**
   - `testMode: false`로 설정
   - 수거지 주소를 명확히 입력

2. **로그 확인**
   ```bash
   supabase functions logs shipments-book
   ```

3. **로그에서 확인할 내용:**
   ```
   🔍 주소 정보 (처리 전):
     pickupInfo_address: "[실제 고객 주소]"  ← 이게 있어야 함!
   
   🐛 [DEBUG] 수거 라벨:
     📤 rec* = 고객: [고객이름] / [고객주소] ← 이게 맞는지 확인!
   
   📦 우체국 소포신청 요청:
     고객주소_rec: "[고객주소]"  ← 수거지 주소가 맞는지!
   ```

4. **우체국 송장번호로 확인**
   - 송장번호 받으면 우체국 고객센터(1588-1300)에 전화
   - "송장번호 [regiNo]로 수거지 주소가 어디로 등록되었나요?"
   - 실제 고객 주소가 맞는지 확인

### 방법 3: 긴급 패치 (임시)

만약 `pickupInfo.address`가 비어있는 문제라면, 임시로 하드코딩:

```typescript
// shipments-book/index.ts (라인 212-220)

if (!pickupInfo.address) {
  console.error('❌ 수거지 주소가 비어있습니다! 주문을 취소하세요.');
  return errorResponse(
    '수거지 주소가 입력되지 않았습니다. 주문 정보를 확인해주세요.',
    400,
    'MISSING_PICKUP_ADDRESS'
  );
}
```

→ 주소 없으면 아예 에러 반환하도록 변경

## 🎯 체크리스트

### 즉시 확인 (5분)
- [ ] 로그에서 `pickupInfo_address` 값 확인
- [ ] 로그에서 `recAddr1` 파라미터 확인
- [ ] `rec* = 고객`에 실제 고객 주소가 있는지 확인

### Flutter 앱 확인 (10분)
- [ ] `pickup_address_id`가 전달되는지 확인
- [ ] 수거 신청 시 주소 입력 화면 확인
- [ ] 디버깅 로그 추가

### DB 확인 (5분)
- [ ] `orders` 테이블에 `pickup_address` 저장되는지 확인
- [ ] `addresses` 테이블에 사용자 주소 등록되어 있는지 확인

### 우체국 확인 (5분)
- [ ] 송장번호로 우체국 고객센터 문의
- [ ] 등록된 수거지 주소 확인

## 📞 우체국 고객센터 문의 스크립트

```
안녕하세요, 송장번호 [regiNo]로 수거 예약을 했는데요,
수거지 주소가 어디로 등록되었는지 확인 부탁드립니다.

[고객센터에서 알려주는 주소 확인]

→ 센터 주소로 등록되어 있으면: "주소 매핑 문제"
→ 다른 주소로 등록되어 있으면: "주소 입력 문제"
→ 주소가 없거나 이상하면: "API 파라미터 문제"
```

## 🔧 디버깅 스크립트

### 주소 확인 스크립트
```bash
# check_address_mapping.sh
#!/bin/bash

echo "🔍 최근 수거 신청 주소 확인"
echo "================================"

supabase functions logs shipments-book --limit 1 | grep -A 5 "주소 정보"
supabase functions logs shipments-book --limit 1 | grep -A 5 "DEBUG.*수거 라벨"
supabase functions logs shipments-book --limit 1 | grep -A 10 "우체국 소포신청 요청"
```

## 📊 예상 시나리오

### ✅ 정상 케이스
```
pickupInfo_address: "서울시 강남구 테헤란로 123"
recAddr1: "서울시 강남구 테헤란로 123"
→ 수거원이 고객 주소로 방문 ✅
```

### ❌ 문제 케이스 1
```
pickupInfo_address: ""  (비어있음)
recAddr1: "고객 수거지 주소"  (기본값)
→ 수거원이 어디로 가야할지 모름 ❌
```

### ❌ 문제 케이스 2
```
pickupInfo_address: "대구광역시 동구 동촌로 1"  (센터 주소)
recAddr1: "대구광역시 동구 동촌로 1"
ordAddr1: "대구광역시 동구 동촌로 1"
→ 출발지와 도착지가 같아서 우체국에서 거부 ❌
```

## 🚀 다음 단계

1. **로그 확인** (지금 바로)
   ```bash
   supabase functions logs shipments-book --limit 5
   ```

2. **문제 케이스 확인**
   - `pickupInfo_address` 값이 무엇인지
   - `recAddr1` 파라미터에 무엇이 들어가는지

3. **원인 파악**
   - Flutter 앱 문제 vs DB 문제 vs API 문제

4. **해결 방안 적용**

---

**작성일**: 2024-12-19  
**우선순위**: 🔴 긴급  
**예상 해결 시간**: 10-30분

