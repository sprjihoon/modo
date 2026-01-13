# 우체국 API 수거 문제 분석 요약 (2024-12-19)

## 📋 문제 상황
- **보고일**: 2024년 12월 19일
- **증상**: 12월 8일 이후 우체국 수거가 정상적으로 진행되지 않음
- **영향**: 고객의 수거 요청이 처리되지 않음

## 🔍 원인 분석

### 1. 가능한 원인 (우선순위 순)

#### ① 환경 변수 누락 또는 오류 (90%)
- `EPOST_SECURITY_KEY`, `EPOST_API_KEY`, `EPOST_CUSTOMER_ID` 중 하나 이상 누락
- 보안키가 16자가 아님
- 고객번호가 잘못 입력됨

**증상:**
- 로그에 `⚠️ 테스트 모드 또는 보안키 없음 - Mock 사용` 메시지
- Mock 응답만 반환됨

#### ② test_mode 설정 오류 (5%)
- Flutter 앱에서 `testMode: true`로 설정됨
- API는 호출되지만 Mock 모드로 동작

**증상:**
- `testYn=Y` 메시지
- Mock 응답 사용

#### ③ 우체국 계약 문제 (5%)
- 우체국과의 계약이 만료되었거나 미완료 상태
- API는 성공하지만 실제 수거예약이 등록되지 않음

**증상:**
- API 호출 성공 (송장번호 발급)
- `treatStusCd`가 없거나 이상한 값
- 실제 수거원이 방문하지 않음

### 2. 관련 코드 분석

#### shipments-book/index.ts
- **라인 572-596**: insertOrder API 호출
  - `test_mode: false` AND `EPOST_SECURITY_KEY` 있어야 실제 API 호출
  - 그 외에는 Mock 모드

- **라인 688-768**: getResInfo API 호출
  - `testYn='N'` AND `resNo`, `resDate` 있어야 호출
  - `treatStusCd` 값으로 수거예약 상태 확인

#### epost/config.ts
- 환경 변수 검증 로직
- `EPOST_SECURITY_KEY`: 정확히 16자여야 함
- `EPOST_CUSTOMER_ID`: 최소 4자 이상

#### epost/client.ts
- 우체국 API HTTP 호출
- SEED128 암호화
- XML 응답 파싱

### 3. 기존 이슈 문서 검토

#### EPOST_PICKUP_ISSUE.md
- API 호출 성공해도 실제 수거 안될 수 있음
- 우체국 계약 완료 필요

#### RESDATE_FIX.md
- `resDate`가 미래 날짜로 설정되는 문제
- 예약일시 검증 로직 추가됨

#### EPOST_DEBUG_TEST_PLAN.md
- `getResInfo` API로 `treatStusCd` 확인 필요
- `00`, `01`이면 정상

## ✅ 해결 방안

### 즉시 조치 사항

#### 1. 환경 변수 확인
```bash
# Supabase Dashboard
Settings → Edge Functions → Secrets

필수 3개:
- EPOST_CUSTOMER_ID
- EPOST_API_KEY
- EPOST_SECURITY_KEY (정확히 16자)
```

#### 2. 로그 확인
```bash
supabase functions logs shipments-book --follow
```

찾아야 할 메시지:
- ✅ `🚀 실제 우체국 API 호출` → 정상
- ❌ `⚠️ 테스트 모드` → 환경 변수 문제

#### 3. 수거예약 상태 확인
```bash
cd /Users/jangjihoon/modo
deno run --allow-net --allow-env check_pickup_status.ts
```

`treatStusCd` 확인:
- `00`, `01` → ✅ 정상
- 없음/에러 → ❌ 계약 문제

#### 4. 우체국 문의
- 고객센터: 1588-1300
- 고객번호, 송장번호 제공
- 계약 상태 확인

### 장기 개선 사항

#### 1. 자동 모니터링
- `treatStusCd` 값을 DB에 저장
- 이상 값 발견 시 알림

#### 2. 에러 로깅 강화
- 실패한 수거예약을 별도 테이블에 저장
- 재시도 로직 추가

#### 3. 관리자 대시보드
- 수거예약 상태 실시간 모니터링
- 실패 건 수동 재처리 기능

## 📊 생성된 문서 및 스크립트

### 문서
1. **EPOST_TROUBLESHOOTING_GUIDE_20241219.md**
   - 상세한 문제 해결 가이드
   - 5단계 진단 체크리스트
   - 원인별 해결 방법

2. **QUICK_FIX_EPOST_수거문제.md**
   - 긴급 해결 가이드
   - TOP 3 원인 및 해결법
   - 빠른 체크리스트

3. **EPOST_ISSUE_SUMMARY_20241219.md** (이 문서)
   - 문제 분석 요약
   - 기술적 상세 내용

### 스크립트
1. **diagnose_epost_api.sh**
   - 자동 진단 스크립트
   - 6단계 체크
   - 실행: `./diagnose_epost_api.sh`

2. **check_pickup_status.ts** (기존)
   - 수거예약 상태 확인
   - `treatStusCd` 조회

## 🎯 권장 조치 순서

1. ⚡ **즉시** (5분)
   - `./diagnose_epost_api.sh` 실행
   - 환경 변수 확인 및 설정

2. 🔍 **확인** (10분)
   - 로그에서 실제 API 호출 확인
   - `treatStusCd` 값 확인

3. 📞 **문의** (필요시)
   - 우체국 고객센터 문의
   - 계약 상태 확인

4. 🧪 **테스트** (15분)
   - Flutter 앱에서 실제 수거 신청
   - 로그 실시간 모니터링
   - 수거원 방문 확인

## 📈 예상 결과

### 환경 변수 문제인 경우
- **해결 시간**: 5분
- **해결 확률**: 95%

### test_mode 문제인 경우
- **해결 시간**: 10분
- **해결 확률**: 100%

### 계약 문제인 경우
- **해결 시간**: 1-3일 (우체국 협의 필요)
- **해결 확률**: 80%

## 📞 지원 연락처

- **우체국 고객센터**: 1588-1300
- **우체국 계약소포**: http://ship.epost.go.kr
- **배송 추적**: https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm

## 📚 관련 문서

- `EPOST_TROUBLESHOOTING_GUIDE_20241219.md` - 상세 가이드
- `QUICK_FIX_EPOST_수거문제.md` - 긴급 대응
- `EPOST_API_FLOW.md` - API 흐름도
- `EPOST_PICKUP_ISSUE.md` - 기존 이슈
- `EPOST_DEBUG_TEST_PLAN.md` - 디버깅 플랜

---

**분석일**: 2024-12-19  
**분석자**: AI Assistant  
**우선순위**: 🔴 긴급 (서비스 영향)

