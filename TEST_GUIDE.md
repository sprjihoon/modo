# 우체국 API 테스트 가이드

## 테스트 방법

### 방법 1: Flutter 앱에서 테스트 (권장)

1. **Flutter 앱 실행**
   ```bash
   cd /Users/jangjihoon/modo/apps/mobile
   flutter run
   ```

2. **결제 페이지로 이동**
   - 주문 생성 후 결제 페이지로 이동
   - 또는 기존 주문의 결제 페이지로 이동

3. **실제 우체국 API 테스트 버튼 클릭**
   - 결제 페이지에서 "🚚 실제 우체국 API" 버튼 클릭
   - `testMode: false`로 설정되어 실제 API 호출

4. **로그 확인**
   - Supabase Dashboard → Edge Functions → shipments-book → Logs
   - 또는 Supabase CLI로 로그 확인:
     ```bash
     supabase functions logs shipments-book --tail
     ```

### 방법 2: Supabase Edge Function 직접 호출

```bash
# Supabase 프로젝트 디렉토리로 이동
cd /Users/jangjihoon/modo

# Edge Function 직접 호출 (예시)
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/shipments-book' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "order_id": "test-order-123",
    "pickup_address": "서울시 강남구 테헤란로 123",
    "pickup_phone": "010-1234-5678",
    "pickup_zipcode": "06142",
    "delivery_address": "대구광역시 동구 동촌로 1",
    "delivery_address_detail": "동대구우체국 2층 소포실 모두의수선",
    "delivery_phone": "010-0000-0000",
    "delivery_zipcode": "41142",
    "customer_name": "테스트 고객",
    "test_mode": false
  }'
```

## 확인할 로그 항목

### 1. testYn 파라미터 확인
```
🔍 개발 체크 - testYn 파라미터: {
  test_mode: false,
  testYn: 'N',
  expected: 'N',
  isCorrect: true
}
```

### 2. API 호출 전 파라미터 검증
```
🔍 개발 체크 - API 호출 전 파라미터 검증: {
  custNo: "...",
  apprNo: "...",
  orderNo: "...",
  recNm: "...",
  recZip: "41142",
  recAddr1: "...",
  recTel: "...",
  testYn: "N",
  ...
}
```

### 3. URL 파라미터 확인
```
🔍 개발 체크 - URL 파라미터: {
  hasTestYn: false,  // testYn='N'일 때는 URL에 포함되지 않음 (정상)
  testYnValue: "없음",
  hasRegData: true
}
```

### 4. regData 파라미터 확인
```
🔍 개발 체크 - regData 파라미터: {
  hadTestYn: true,
  testYnRemoved: true,  // regData에서 testYn이 제거됨 (정상)
  regDataKeys: [...],
  testYnValue: "N"
}
```

### 5. API 응답 검증
```
✅ 실제 API 응답: {
  regiNo: "1234567890123",  // 운송장번호
  resNo: "1234567890",       // 소포 예약번호
  resDate: "20240101120000",  // 예약 일시
  regiPoNm: "동대구우체국",   // 접수 우체국명
  ...
}
```

### 6. 수거예약 상태 확인
```
✅ 수거예약 상태 확인 결과: {
  reqNo: "...",
  resNo: "...",
  regiNo: "...",
  treatStusCd: "01",  // 00:신청준비, 01:소포신청 (실제 수거예약 등록됨)
  treatStusMeaning: "소포신청",
  ...
}
```

## 예상 결과

### 정상 동작 시
- ✅ `testYn`이 `'N'`으로 설정됨
- ✅ URL에 `testYn` 파라미터가 포함되지 않음 (정상)
- ✅ `regData`에서 `testYn`이 제거됨
- ✅ API 응답에서 `regiNo`, `resNo`, `resDate`를 받음
- ✅ `getResInfo` API 호출 성공
- ✅ `treatStusCd`가 `00` 또는 `01` (실제 수거예약 등록됨)

### 문제 발생 시
- ❌ `testYn`이 `'Y'`로 설정됨 → `test_mode` 파라미터 확인
- ❌ URL에 `testYn=Y`가 포함됨 → `test_mode` 파라미터 확인
- ❌ `regData`에 `testYn`이 포함됨 → 코드 로직 확인
- ❌ `getResInfo` API 호출 실패 → 파라미터 확인
- ❌ `treatStusCd`가 `00` 또는 `01`이 아님 → 우체국 고객센터 문의

## 문제 해결

### testYn이 'Y'로 설정되는 경우
1. Flutter 앱에서 `testMode: false`로 전달되었는지 확인
2. Edge Function에서 `test_mode` 파라미터가 올바르게 파싱되었는지 확인
3. 로그에서 `test_mode` 값 확인

### 수거예약이 등록되지 않는 경우
1. `getResInfo` API 호출 결과 확인
2. `treatStusCd` 값 확인
3. 우체국 고객센터(1588-1300)에 송장번호로 문의

## 참고 사항

- 실제 API 호출 시 비용이 발생할 수 있습니다
- 테스트 시 실제 수거예약이 등록되므로 주의하세요
- 문제 발생 시 로그를 저장하여 분석하세요

