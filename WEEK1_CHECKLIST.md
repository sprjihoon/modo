# ✅ WEEK 1 완료 체크리스트

## 📅 작업 기간
- 시작: 2025-01-24
- 목표 완료: 2025-01-31

---

## A) 프로젝트 기본 셋업

- [x] `.env` 파일 생성 (루트)
- [ ] Supabase URL/KEY 실제 값 입력
- [x] `.gitignore` 확인 (.env, Firebase 파일 제외)
- [x] `apps/mobile/.env` 생성
- [x] `apps/admin/.env.local` 생성
- [x] Mock 모드 활성화 확인

**완료 증빙:**
- [x] `.env` 파일 존재 확인
- [ ] Supabase 키 정상 작동 확인

---

## B) Supabase 설정

### 프로젝트 생성
- [ ] Supabase 계정 생성
- [ ] 프로젝트 생성 (`modu-repair`)
- [ ] Region 설정 (Seoul)
- [ ] Database Password 저장

### Auth 설정
- [ ] Email Provider 활성화
- [ ] Confirm email OFF (개발용)
- [ ] Test 사용자 계정 생성

### Storage 설정
- [ ] `images-public` 버킷 생성 (Public ON)
- [ ] `images-private` 버킷 생성 (Public OFF)

### Database 스키마
- [ ] `01_users.sql` 실행 완료
- [ ] `02_orders.sql` 실행 완료
- [ ] `03_shipments.sql` 실행 완료
- [ ] `04_payments.sql` 실행 완료
- [ ] `05_videos.sql` 실행 완료
- [ ] `06_notifications.sql` 실행 완료
- [ ] RLS 활성화 확인 (모든 테이블)

### 관리자 계정
- [ ] `admin@admin.modorepair.com` 계정 생성
- [ ] `users` 테이블에 데이터 추가
- [ ] 관리자 권한 확인

**완료 증빙:**
- [ ] Supabase Dashboard 스크린샷
  - Tables 목록
  - RLS 활성화 상태
  - Storage 버킷
- [ ] 관리자 계정 로그인 성공

---

## C) Edge Functions 로컬 구동

### 환경 준비
- [ ] Supabase CLI 설치
- [ ] Docker 실행 확인
- [ ] `apps/edge` 디렉토리 확인

### 로컬 실행
- [ ] `supabase start` 성공
- [ ] `supabase functions serve` 성공
- [ ] 3개 함수 인식 확인
  - shipments-book
  - payments-verify
  - videos-upload

### Mock 응답 확인
- [ ] `/payments-verify` 200 OK
- [ ] `/shipments-book` 200 OK
- [ ] `/videos-upload` 200 OK

**완료 증빙:**
- [ ] 터미널 로그 스크린샷
- [ ] cURL 테스트 결과

---

## D) Admin(Next.js) 실행

### 환경 설정
- [ ] `apps/admin` 이동
- [ ] `.env.local` 설정 확인
- [ ] Radix UI 의존성 추가 확인

### 설치 및 실행
- [ ] `npm install` 성공
- [ ] `npm run dev` 성공
- [ ] http://localhost:3000 접속

### UI 확인
- [ ] 로그인 페이지 렌더링
- [ ] 대시보드 접근 (더미 데이터)
- [ ] 주문 목록 페이지 표시
- [ ] 주문 상세 페이지 표시
- [ ] 타임라인 컴포넌트 렌더링
- [ ] 영상 업로드 UI 확인

**완료 증빙:**
- [ ] 각 페이지 스크린샷
  - 로그인
  - 대시보드
  - 주문 목록
  - 주문 상세

---

## E) Mobile(Flutter) 실행

### 환경 설정
- [ ] `apps/mobile` 이동
- [ ] `.env` 설정 확인
- [x] `google-services.json` 생성 (더미)
- [x] `GoogleService-Info.plist` 생성 (더미)

### 설치 및 실행
- [ ] `flutter pub get` 성공
- [ ] `flutter devices` 확인
- [ ] `flutter run` 성공

### UI 확인
- [ ] 스플래시 화면 표시
- [ ] 로그인 페이지 렌더링
- [ ] 홈 화면 표시
- [ ] 주문 목록 UI
- [ ] 주문 상세 UI
- [ ] 5단계 타임라인 표시

**완료 증빙:**
- [ ] 각 화면 스크린샷
  - 스플래시
  - 로그인
  - 홈
  - 주문 목록
  - 주문 상세

---

## F) 스모크 테스트

### 테스트 준비
- [ ] Edge Functions 실행 중
- [ ] Supabase ANON_KEY 확인
- [ ] cURL 또는 Postman 준비

### API 테스트

#### 1. 결제 검증
```bash
curl -X POST http://localhost:54321/functions/v1/payments-verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "order_id": "ORD-TEST-001",
    "amount": 36000,
    "pg_tid": "T123",
    "imp_uid": "imp_123",
    "merchant_uid": "merchant_123"
  }'
```

- [ ] 응답 200 OK
- [ ] `verified: true` 확인
- [ ] Mock payment 데이터 반환

#### 2. 송장 발급
```bash
curl -X POST http://localhost:54321/functions/v1/shipments-book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "order_id": "ORD-TEST-001",
    "pickup_address": "서울시 강남구 테헤란로 123",
    "pickup_phone": "010-1234-5678",
    "delivery_address": "서울시 강남구 테헤란로 456",
    "delivery_phone": "010-9876-5432",
    "customer_name": "홍길동"
  }'
```

- [ ] 응답 200 OK
- [ ] `tracking_no` 반환
- [ ] Mock shipment 데이터 반환

#### 3. 영상 업로드
```bash
curl -X POST http://localhost:54321/functions/v1/videos-upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "tracking_no": "MOCK1234567890123",
    "video_type": "INBOUND",
    "video_url": "https://example.com/video.mp4"
  }'
```

- [ ] 응답 200 OK
- [ ] `video_id` 반환
- [ ] `stream_url` 반환

**완료 증빙:**
- [ ] 각 API 응답 로그
- [ ] PowerShell 스크립트 실행 결과

---

## G) 문서 및 보안

### 문서 확인
- [x] `README.md` 최신 상태
- [x] `WEEK1_SETUP.md` 작성 완료
- [x] `docs/architecture.md` 검토
- [x] `docs/api-spec.md` 검토
- [x] `docs/database-schema.md` 검토
- [x] `docs/deployment.md` 검토

### 보안 확인
- [x] `.env` Git 제외 확인
- [x] `google-services.json` Git 제외
- [x] `GoogleService-Info.plist` Git 제외
- [ ] 실제 API 키 노출 없음

### 스크립트
- [x] `scripts/setup-week1.ps1` 작성
- [x] `scripts/test-apis.ps1` 작성
- [x] `scripts/run-admin.ps1` 작성
- [x] `scripts/run-mobile.ps1` 작성

---

## 📊 최종 검증

### 통합 테스트
- [ ] Admin → Supabase 연결 확인
- [ ] Mobile → Supabase 연결 확인
- [ ] Edge Functions → Database 연결 확인
- [ ] tracking_no 기반 데이터 플로우 확인

### 성능 확인
- [ ] Admin 페이지 로딩 < 3초
- [ ] Mobile 앱 시작 < 2초
- [ ] API 응답 시간 < 1초

### 에러 핸들링
- [ ] 잘못된 API 요청 시 적절한 에러
- [ ] RLS 권한 오류 확인
- [ ] 로그인 실패 처리

---

## 📸 완료 증빙 자료

### 필수 제출 자료
1. **Supabase Dashboard**
   - [ ] Tables 목록 스크린샷
   - [ ] RLS 활성화 상태
   - [ ] Storage 버킷

2. **Admin Web**
   - [ ] 로그인 화면
   - [ ] 대시보드
   - [ ] 주문 관리 화면

3. **Mobile App**
   - [ ] 스플래시/로그인
   - [ ] 홈 화면
   - [ ] 주문 상세 (타임라인)

4. **API 테스트**
   - [ ] 3개 API cURL 결과
   - [ ] PowerShell 스크립트 실행 로그

5. **코드**
   - [ ] GitHub 커밋 내역
   - [ ] .gitignore 설정 확인

---

## 🎯 완료 조건

**모든 항목이 체크되었을 때 WEEK 1 완료로 간주합니다.**

- [ ] Supabase 설정 100% 완료
- [ ] Edge Functions 3개 모두 작동
- [ ] Admin 웹 정상 실행
- [ ] Mobile 앱 정상 실행
- [ ] API 스모크 테스트 통과
- [ ] 문서 최신화
- [ ] 보안 체크 완료

---

## 📝 완료 보고 템플릿

```
WEEK 1 완료 보고

작업 기간: 2025-01-24 ~ 2025-01-XX
완료 항목:
- [x] Supabase 프로젝트 설정
- [x] Database 스키마 6개 테이블 생성
- [x] Edge Functions 3개 Mock 구현
- [x] Admin 웹 콘솔 실행
- [x] Mobile 앱 실행
- [x] API 스모크 테스트 통과

미완료/이슈:
- [ ] (있을 경우 기재)

증빙 자료:
- Supabase: [링크/스크린샷]
- Admin: [링크/스크린샷]
- Mobile: [스크린샷]
- API Test: [로그]

다음 주 계획:
- Supabase Auth 실제 연동
- 결제 기능 구현
- 실제 우체국 API 연동 준비
```

---

**Last Updated**: 2025-01-24
**Version**: 1.0

