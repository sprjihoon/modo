# 🚨 긴급: 배송지 동일 설정 문제 (수거 실패 원인 확정!)

## ❌ 문제 확인됨!

Flutter 로그에서 발견:
```
flutter: 배송지 동일 여부: true  ← 문제!
flutter: pickup_address: 대구 수성구 화랑로2길 62
flutter: delivery_address: 대구 수성구 화랑로2길 62  ← 수거지와 동일!
```

**최근 주문 ID**: `be6ab905-2b82-4432-8754-8c0964e11d92`

## 🔍 문제 분석

### 현재 상황
사용자가 "배송지 동일" 옵션을 선택 → 수거지와 배송지가 같은 주소로 설정됨

### 반품소포 로직
```typescript
// shipments-book/index.ts
// 반품소포: 고객(수거지) → 센터(배송지)

ordAddr1: deliveryInfo.address,  // 배송지 (센터여야 함!)
recAddr1: pickupInfo.address,    // 수거지 (고객 주소)
```

### 문제 시나리오

**배송지 동일 = true일 때:**
```
pickupInfo.address = "대구 수성구 화랑로2길 62"  (고객 주소)
deliveryInfo.address = "대구 수성구 화랑로2길 62"  (고객 주소) ← 센터가 아님!

↓ 반품소포 매핑

recAddr1 = "대구 수성구 화랑로2길 62"  (출발지: 고객)
ordAddr1 = "대구 수성구 화랑로2길 62"  (도착지: 고객) ← 문제!
```

**결과:**
- 출발지 = 도착지 = 같은 주소
- 우체국: "같은 주소로 배송할 수 없습니다" → 거부 또는 무시

## ✅ 해결 방법

### 방법 1: CENTER_FORCE 환경 변수 확인 (즉시)

```bash
# Supabase Dashboard
Settings → Edge Functions → Secrets

확인:
CENTER_FORCE=true  ← 이 값이 설정되어 있어야 함!
```

**코드 확인 (shipments-book/index.ts, 라인 81, 228):**
```typescript
const CENTER_FORCE = (Deno.env.get('CENTER_FORCE') || 'true').toLowerCase() === 'true';

if (CENTER_FORCE || !deliveryInfo.address) {
  // 배송지를 센터 주소로 강제 변경
  deliveryInfo = {
    address: CENTER_ADDRESS1,
    detail: CENTER_ADDRESS2,
    zipcode: CENTER_ZIPCODE,
    phone: CENTER_PHONE,
  };
}
```

**문제:**
- `CENTER_FORCE=false`로 설정되어 있으면 → 센터 주소로 강제되지 않음!
- 사용자가 입력한 배송지(=수거지)가 그대로 사용됨

### 방법 2: Edge Function 로그 확인

Supabase Dashboard에서 로그 확인:
1. https://supabase.com/dashboard
2. 프로젝트 선택
3. Edge Functions → shipments-book → Logs
4. 주문 ID `be6ab905-2b82-4432-8754-8c0964e11d92` 검색

**확인할 내용:**
```
🔍 주소 정보 (처리 전):
  pickupInfo_address: "대구 수성구 화랑로2길 62"
  deliveryInfo_address: "???"  ← 여기가 센터 주소인지 확인!

🐛 [DEBUG] 수거 라벨:
  📥 ord* = 센터: "???"  ← 센터 주소인지 확인!
  📤 rec* = 고객: "대구 수성구 화랑로2길 62"

📦 우체국 소포신청 요청:
  센터주소_ord: "???"  ← 센터 주소인지 확인!
  고객주소_rec: "대구 수성구 화랑로2길 62"
```

### 방법 3: DB 직접 확인

```sql
-- Supabase SQL Editor
SELECT 
  id,
  order_number,
  pickup_address,
  pickup_zipcode,
  delivery_address,
  delivery_zipcode,
  created_at
FROM orders
WHERE id = 'be6ab905-2b82-4432-8754-8c0964e11d92';
```

**확인:**
- `delivery_address`가 센터 주소인지?
- `pickup_address`와 `delivery_address`가 다른지?

### 방법 4: 긴급 패치 (코드 수정)

**shipments-book/index.ts 수정 필요:**

```typescript
// 라인 228 부근 - CENTER_FORCE 로직 강화

// 🚨 수거 신청은 항상 센터가 배송지여야 함
// 배송지 동일 여부와 관계없이 강제로 센터 주소 사용
console.log('🔒 수거 신청: 배송지를 센터 주소로 강제 설정');

// 배송지를 항상 센터 주소로 설정
if (true) {  // 항상 true (수거 신청은 무조건 센터가 배송지)
  // DB에서 ops_center_settings 조회
  try {
    const { data: centerRow } = await supabase
      .from('ops_center_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
      
    if (centerRow) {
      deliveryInfo = {
        address: centerRow.address1 || CENTER_ADDRESS1,
        detail: centerRow.address2 || CENTER_ADDRESS2,
        zipcode: centerRow.zipcode || CENTER_ZIPCODE,
        phone: centerRow.phone || CENTER_PHONE,
      };
    } else {
      deliveryInfo = {
        address: CENTER_ADDRESS1,
        detail: CENTER_ADDRESS2,
        zipcode: CENTER_ZIPCODE,
        phone: CENTER_PHONE,
      };
    }
    
    console.log('✅ 배송지(센터) 강제 설정 완료:', deliveryInfo);
  } catch (err) {
    console.error('❌ 센터 주소 조회 실패:', err);
    // 기본값 사용
    deliveryInfo = {
      address: CENTER_ADDRESS1,
      detail: CENTER_ADDRESS2,
      zipcode: CENTER_ZIPCODE,
      phone: CENTER_PHONE,
    };
  }
}
```

## 🎯 즉시 조치 사항

### 1. 환경 변수 확인 (5분)
```
Supabase Dashboard → Settings → Edge Functions → Secrets

CENTER_FORCE=true  ← 설정되어 있는지 확인
```

### 2. 로그 확인 (5분)
```
Supabase Dashboard → Edge Functions → shipments-book → Logs

주문 ID로 검색: be6ab905-2b82-4432-8754-8c0964e11d92
"센터주소_ord" 값 확인
```

### 3. 코드 수정 (필요시, 10분)
```bash
cd /Users/jangjihoon/modo

# shipments-book/index.ts 수정
# 라인 228 부근의 CENTER_FORCE 로직을 항상 true로 변경

# 배포
supabase functions deploy shipments-book
```

### 4. 재테스트 (10분)
```
Flutter 앱에서:
1. 새 수거 신청
2. "배송지 동일" 체크하든 안하든
3. 로그 확인 → 센터 주소로 강제되는지 확인
```

## 📊 예상 원인

### 가설 1: CENTER_FORCE=false (90%)
```
CENTER_FORCE=false
↓
deliveryInfo가 사용자 입력값 사용
↓
배송지 = 수거지 (같은 주소)
↓
우체국 거부
```

### 가설 2: CENTER_FORCE 로직 버그 (10%)
```
CENTER_FORCE=true이지만
조건문에서 잘못 처리
↓
센터 주소로 강제되지 않음
```

## 🔧 검증 방법

### 최근 주문 로그에서 확인
```
ord* = 센터 (도착지): [센터 주소] ← 이게 맞아야 함
rec* = 고객 (출발지): 대구 수성구 화랑로2길 62

만약:
ord* = 센터: 대구 수성구 화랑로2길 62 ← 문제!
rec* = 고객: 대구 수성구 화랑로2길 62
→ 같은 주소!
```

## 📞 우체국 확인

이미 송장번호를 받았다면:
```
우체국 고객센터: 1588-1300

"송장번호 [regiNo]로 수거 예약을 했는데,
출발지와 도착지 주소를 확인 부탁드립니다."

확인:
- 출발지 = 고객 주소 ✅
- 도착지 = 센터 주소? or 고객 주소? ← 여기가 핵심!
```

## 🚀 긴급 수정안

### shipments-book/index.ts (라인 228-289)

**현재 코드:**
```typescript
if (CENTER_FORCE || !deliveryInfo.address) {
  // 센터 주소로 설정
}
```

**수정 후:**
```typescript
// 🚨 수거 신청은 무조건 센터가 배송지!
// CENTER_FORCE 체크 제거, 항상 센터 주소 사용
console.log('🔒 수거 신청: 배송지를 센터 주소로 강제 설정 (배송지 동일 여부 무시)');

// 항상 센터 주소로 설정
try {
  const { data: centerRow } = await supabase
    .from('ops_center_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
    
  if (centerRow) {
    deliveryInfo = {
      address: centerRow.address1 || CENTER_ADDRESS1,
      detail: centerRow.address2 || CENTER_ADDRESS2,
      zipcode: centerRow.zipcode || CENTER_ZIPCODE,
      phone: (centerRow.phone || CENTER_PHONE).toString().replace(/-/g, '').substring(0, 12),
    };
    console.log('✅ 센터 주소(DB): ', deliveryInfo);
  } else {
    deliveryInfo = {
      address: CENTER_ADDRESS1,
      detail: CENTER_ADDRESS2,
      zipcode: CENTER_ZIPCODE,
      phone: CENTER_PHONE,
    };
    console.log('✅ 센터 주소(기본값): ', deliveryInfo);
  }
} catch (err) {
  console.error('❌ 센터 주소 조회 실패, 기본값 사용:', err);
  deliveryInfo = {
    address: CENTER_ADDRESS1,
    detail: CENTER_ADDRESS2,
    zipcode: CENTER_ZIPCODE,
    phone: CENTER_PHONE,
  };
}

// 주소 중복 검증 추가
if (pickupInfo.address === deliveryInfo.address && 
    pickupInfo.zipcode === deliveryInfo.zipcode) {
  console.error('❌ 수거지와 배송지가 같습니다!', {
    pickup: pickupInfo.address,
    delivery: deliveryInfo.address,
  });
  return errorResponse(
    '수거지와 배송지가 동일할 수 없습니다. 시스템 오류입니다.',
    400,
    'SAME_ADDRESS_ERROR'
  );
}
```

---

**작성일**: 2024-12-19  
**우선순위**: 🔴 최긴급  
**예상 해결 시간**: 10분  
**영향**: 모든 수거 신청

