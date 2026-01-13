# 🚨 우체국 수거 문제 긴급 해결 가이드

> **12월 8일 이후 수거가 진행되지 않는 문제 해결**

## ⚡ 빠른 진단 (3분)

### 1. 자동 진단 스크립트 실행
```bash
cd /Users/jangjihoon/modo
./diagnose_epost_api.sh
```

스크립트가 단계별로 문제를 진단하고 해결 방법을 안내합니다.

---

## 🔥 가장 흔한 원인 TOP 3

### ❌ 원인 1: 환경 변수 누락 (90% 확률)

**증상:**
- 로그에 `⚠️ 테스트 모드 또는 보안키 없음` 메시지

**해결:**
1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. Settings → Edge Functions → Secrets
3. 다음 3개 변수 확인 및 설정:
   ```
   EPOST_CUSTOMER_ID     (고객번호)
   EPOST_API_KEY          (API 인증키)
   EPOST_SECURITY_KEY     (보안키, 정확히 16자)
   ```

**확인 방법:**
```bash
supabase functions logs shipments-book --limit 5
```
→ `🚀 실제 우체국 API 호출` 메시지가 보여야 함

---

### ❌ 원인 2: test_mode가 true로 설정 (5% 확률)

**증상:**
- API 호출은 되지만 Mock 응답 사용
- 실제 수거원이 오지 않음

**해결:**
Flutter 앱 코드 확인:
```dart
// apps/mobile/lib/features/orders/presentation/pages/pickup_request_page.dart

final response = await _orderService.bookShipment(
  orderId: widget.order.id,
  testMode: false,  // ✅ false여야 함
);
```

---

### ❌ 원인 3: 우체국 계약 미완료 (5% 확률)

**증상:**
- API 호출 성공 (송장번호 발급됨)
- 하지만 실제 수거원이 오지 않음

**확인:**
수거예약 상태 확인 스크립트 실행:
```bash
cd /Users/jangjihoon/modo

# 1. check_pickup_status.ts 파일에서 최근 주문 정보로 업데이트
# orderNo와 reqYmd를 로그에서 확인한 값으로 변경

# 2. 실행
deno run --allow-net --allow-env check_pickup_status.ts
```

**treatStusCd 확인:**
- `00` 또는 `01`: ✅ 정상 (수거예약 등록됨)
- 없음 또는 에러: ❌ 계약 문제

**해결:**
- 우체국 고객센터 문의: **1588-1300**
- 고객번호와 송장번호 제공
- 계약 상태 확인 요청

---

## 📊 실시간 로그 모니터링

```bash
# 실시간 로그 확인
supabase functions logs shipments-book --follow
```

### ✅ 정상 로그 예시
```
🚀 실제 우체국 API 호출 시작
✅ 실제 API 응답: {"regiNo":"6896770094291", "resNo":"123456789", ...}
✅ getResInfo API 호출 성공!
treatStusCd: "01" (소포신청)
✅ 수거예약이 정상적으로 등록되었습니다.
```

### ❌ 문제 로그 예시
```
⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용
```
→ **환경 변수 누락**

```
❌ EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.
```
→ **고객번호 미설정**

```
❌ EPost API Error: ERR-211 - 고객번호(custNo) 값이 유효하지 않습니다.
```
→ **고객번호 오류**

---

## 🎯 빠른 체크리스트

진단하기 전에 다음을 확인하세요:

- [ ] Supabase Dashboard에서 환경 변수 3개 설정 확인
  - `EPOST_CUSTOMER_ID`
  - `EPOST_API_KEY`
  - `EPOST_SECURITY_KEY` (정확히 16자)

- [ ] Flutter 앱에서 `testMode: false` 설정 확인

- [ ] 로그에서 `🚀 실제 우체국 API 호출` 메시지 확인

- [ ] API 응답에서 `regiNo`, `resNo`, `resDate` 확인

- [ ] `getResInfo` API 호출 성공 확인

- [ ] `treatStusCd`가 `00` 또는 `01`인지 확인

---

## 🆘 긴급 수거 요청 (Edge Function 사용 불가 시)

### 방법 1: 우체국 웹사이트
1. http://ship.epost.go.kr 접속
2. 고객번호로 로그인
3. 수거예약 메뉴
4. 수거지 정보 입력

### 방법 2: 전화 수거 신청
- 우체국 고객센터: **1588-1300**
- 계약번호와 수거지 주소 제공

---

## 📞 지원 연락처

- **우체국 고객센터**: 1588-1300
- **우체국 계약소포**: http://ship.epost.go.kr
- **배송 추적**: https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm

---

## 📚 상세 문서

더 자세한 내용은 다음 문서를 참고하세요:

- **전체 가이드**: `EPOST_TROUBLESHOOTING_GUIDE_20241219.md`
- **API 흐름**: `EPOST_API_FLOW.md`
- **수거 문제**: `EPOST_PICKUP_ISSUE.md`
- **디버깅 플랜**: `EPOST_DEBUG_TEST_PLAN.md`

---

**작성일**: 2024-12-19  
**업데이트**: 12월 8일 이후 수거 문제 대응

