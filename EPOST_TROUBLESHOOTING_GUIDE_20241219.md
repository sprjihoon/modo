# 우체국 API 수거 문제 해결 가이드 (2024년 12월 19일)

## 📋 문제 상황
12월 8일 이후 우체국 API 수거가 정상적으로 진행되지 않음

## 🔍 진단 체크리스트

### 1단계: 환경 변수 확인
Supabase Dashboard → Settings → Edge Functions → Secrets

```bash
# 필수 환경 변수 (3개)
EPOST_CUSTOMER_ID=vovok1122          # ✅ 고객번호
EPOST_API_KEY=your_api_key           # ✅ API 인증키
EPOST_SECURITY_KEY=your_security_key # ✅ 보안키 (정확히 16자)

# 선택 환경 변수
EPOST_APPROVAL_NO=your_approval_no   # 승인번호 (없으면 자동 조회)
EPOST_OFFICE_SER=251132110           # 공급지 코드
```

**확인 방법:**
```bash
# 로그에서 확인
supabase functions logs shipments-book --follow
```

로그에서 찾아야 할 메시지:
- `✅ 실제 우체국 API 호출 시작` → 실제 API 호출됨
- `⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용` → Mock 모드 (실제 수거 안됨)

### 2단계: test_mode 설정 확인

**Flutter 앱 (`pickup_request_page.dart`)에서:**
```dart
// test_mode: false로 설정되어 있는지 확인
final response = await _orderService.bookShipment(
  orderId: widget.order.id,
  testMode: false,  // ✅ false여야 실제 API 호출
);
```

### 3단계: API 응답 확인

로그에서 다음 정보 확인:
```bash
supabase functions logs shipments-book
```

**확인할 항목:**
```json
{
  "regiNo": "6896770094291",     // ✅ 송장번호 (있어야 함)
  "resNo": "123456789",           // ✅ 소포 예약번호 (있어야 함)
  "resDate": "20241219140000",    // ✅ 예약 일시 (있어야 함)
  "regiPoNm": "동대구우체국"       // ✅ 접수 우체국명
}
```

### 4단계: 수거예약 상태 확인 (중요!)

**수거예약 상태 확인 스크립트 실행:**
```bash
cd /Users/jangjihoon/modo

# check_pickup_status.ts 파일 수정
# orderNo와 reqYmd를 최근 주문으로 업데이트

deno run --allow-net --allow-env check_pickup_status.ts
```

**`treatStusCd` 값 의미:**
- `00`: 신청준비 → ✅ 수거예약 접수됨
- `01`: 소포신청 → ✅ 수거예약 정상 등록됨
- `02`: 운송장출력 → ✅ 수거원 배정됨
- `03`: 집하완료 → ✅ 물품 수거 완료
- `04`: 배송중
- `05`: 배송완료

**문제 진단:**
- `treatStusCd`가 `00` 또는 `01`이면 → ✅ 정상
- `treatStusCd`가 없거나 에러 → ❌ 계약 문제 또는 API 호출 실패

### 5단계: 우체국 고객센터 문의

**우체국 고객센터: 1588-1300**

문의 내용:
1. 고객번호: `EPOST_CUSTOMER_ID` 값 제공
2. 송장번호: 로그에서 확인한 `regiNo` 제공
3. 계약 상태 확인 요청
4. 실제 수거예약이 등록되었는지 확인 요청

## 🚨 주요 원인별 해결 방법

### 원인 1: 환경 변수 누락 또는 잘못 설정
**증상:** 
- 로그에 `⚠️ 테스트 모드` 메시지
- Mock 응답 사용

**해결:**
1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. 필수 3개 환경 변수 확인 및 설정
3. Edge Function 재시작 (자동)

### 원인 2: test_mode가 true로 설정
**증상:**
- API 호출은 성공하지만 Mock 응답
- `testYn=Y` 메시지

**해결:**
1. Flutter 앱 코드에서 `testMode: false` 확인
2. 앱 재빌드 및 재실행

### 원인 3: 우체국 계약 미완료
**증상:**
- API 호출 성공 (`regiNo` 발급됨)
- `treatStusCd`가 없거나 이상한 값
- 실제 수거원이 방문하지 않음

**해결:**
1. 우체국 고객센터(1588-1300) 문의
2. 계약 상태 확인
3. 필요시 계약 완료 절차 진행

### 원인 4: resDate가 이상한 날짜
**증상:**
- `resDate`가 미래 날짜 (예: 2025년 12월)
- 로그에 `⚠️ 예약일시가 이상합니다` 메시지

**해결:**
1. 로그에서 `resDateYmd`와 `todayYmd` 비교
2. 우체국 고객센터 문의
3. API 파라미터에 날짜 지정 가능 여부 확인

## 📊 실시간 디버깅 방법

### 로그 실시간 모니터링
```bash
# shipments-book 로그 실시간 확인
supabase functions logs shipments-book --follow
```

### 중요 로그 메시지

**✅ 정상 동작:**
```
🚀 실제 우체국 API 호출 시작
✅ 실제 API 응답: {"regiNo":"...", "resNo":"...", "resDate":"..."}
✅ getResInfo API 호출 성공!
✅ treatStusCd: "01" (소포신청)
✅ 수거예약이 정상적으로 등록되었습니다.
```

**❌ 문제 발생:**
```
⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용
```
또는
```
❌ EPOST_CUSTOMER_ID 환경 변수가 설정되지 않았습니다.
```
또는
```
❌ EPost API Error: ERR-211 - 고객번호(custNo) 값이 유효하지 않습니다.
```

## 🔧 긴급 수거 요청 방법

Edge Function이 문제가 있을 경우, 수동으로 우체국 수거 요청:

1. **우체국 계약소포 웹사이트 접속**
   - http://ship.epost.go.kr

2. **수동 수거예약**
   - 고객번호로 로그인
   - 수거예약 메뉴
   - 수거지 정보 입력

3. **또는 전화 수거 신청**
   - 우체국 고객센터: 1588-1300
   - 계약번호와 수거지 주소 제공

## 📝 테스트 절차

### 1. Mock 모드 테스트 (안전)
```dart
// Flutter 앱
testMode: true
```
→ 실제 API 호출 없이 로직 검증

### 2. 실제 API 모드 테스트
```dart
// Flutter 앱
testMode: false
```
→ 실제 우체국 API 호출 및 수거예약 생성

### 3. 로그 확인
```bash
supabase functions logs shipments-book --follow
```

### 4. 수거예약 상태 확인
```bash
deno run --allow-net --allow-env check_pickup_status.ts
```

### 5. 실제 수거 확인
- 우체국 기사 방문 대기
- 송장번호로 배송 추적: https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={regiNo}

## 🎯 최종 체크리스트

- [ ] `EPOST_CUSTOMER_ID` 환경 변수 설정됨
- [ ] `EPOST_API_KEY` 환경 변수 설정됨
- [ ] `EPOST_SECURITY_KEY` 환경 변수 설정됨 (16자)
- [ ] Flutter 앱에서 `testMode: false`로 설정됨
- [ ] 로그에서 `🚀 실제 우체국 API 호출` 확인됨
- [ ] API 응답에서 `regiNo`, `resNo`, `resDate` 확인됨
- [ ] `getResInfo` API 호출 성공 확인됨
- [ ] `treatStusCd`가 `00` 또는 `01`임
- [ ] 우체국 고객센터에 송장번호로 수거예약 확인 문의함
- [ ] 우체국 계약 상태 확인함

## 📞 지원 연락처

- **우체국 고객센터**: 1588-1300
- **우체국 계약소포 웹사이트**: http://ship.epost.go.kr
- **배송 추적**: https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm

---

**작성일**: 2024-12-19  
**최종 업데이트**: 2024-12-19

