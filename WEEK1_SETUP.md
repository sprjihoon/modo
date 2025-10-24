# 🚀 WEEK 1 환경 설정 가이드

## 📋 체크리스트

- [x] A) .env 파일 생성 완료
- [ ] B) Supabase 프로젝트 설정
- [ ] C) Edge Functions 로컬 구동
- [ ] D) Admin 웹 실행
- [ ] E) Mobile 앱 실행
- [ ] F) API 스모크 테스트
- [ ] G) 최종 검증

---

## A) 프로젝트 기본 셋업 ✅

### 1. .env 파일 설정

```bash
# .env 파일이 생성되었습니다
# 이제 실제 키를 입력하세요
```

**필수 입력 항목:**

1. **Supabase 키** (https://supabase.com에서 프로젝트 생성 후 확인)
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

2. **Mock 모드 활성화** (Week 1용)
   ```
   USE_MOCK_PAYMENT=true
   USE_MOCK_SHIPPING=true
   USE_MOCK_VIDEO=true
   ```

### 2. .gitignore 확인

```bash
# 다음 파일들이 제외되어야 합니다
.env
.env.local
*.keystore
*.jks
google-services.json
GoogleService-Info.plist
```

✅ **완료!** .gitignore에 이미 설정되어 있습니다.

---

## B) Supabase 설정

### 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트명: `modu-repair` (또는 원하는 이름)
4. Database Password 설정 및 저장
5. Region: `Northeast Asia (Seoul)` 권장

### 2. API 키 복사

1. Settings → API 메뉴
2. **Project URL** → `.env`의 `SUPABASE_URL`에 입력
3. **anon public** → `SUPABASE_ANON_KEY`에 입력
4. **service_role** → `SUPABASE_SERVICE_ROLE_KEY`에 입력

### 3. Auth 설정

1. Authentication → Providers
2. **Email** 활성화
3. Confirm email: **OFF** (개발용)

### 4. Storage 버킷 생성

```sql
-- SQL Editor에서 실행
-- 또는 Dashboard → Storage → New Bucket

-- 1. images-public (공개)
CREATE BUCKET IF NOT EXISTS images-public;

-- 2. images-private (비공개)
CREATE BUCKET IF NOT EXISTS images-private;
```

### 5. DB 스키마 적용

**⚠️ 순서대로 실행하세요!**

Dashboard → SQL Editor → New Query

```bash
# 순서대로 실행:
1. apps/sql/schema/01_users.sql
2. apps/sql/schema/02_orders.sql
3. apps/sql/schema/03_shipments.sql
4. apps/sql/schema/04_payments.sql
5. apps/sql/schema/05_videos.sql
6. apps/sql/schema/06_notifications.sql
```

각 파일의 전체 내용을 복사하여 SQL Editor에 붙여넣고 `Run` 클릭!

### 6. 관리자 계정 생성

Authentication → Users → Add User

```
Email: admin@admin.modusrepair.com
Password: (강력한 비밀번호)
Auto Confirm: ON
```

생성 후 SQL Editor에서:

```sql
-- 관리자 role 설정 (users 테이블에 데이터 추가)
INSERT INTO public.users (auth_id, email, name, phone)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@admin.modusrepair.com'),
  'admin@admin.modusrepair.com',
  '관리자',
  '010-0000-0000'
);
```

### 7. RLS 확인

```sql
-- 모든 테이블의 RLS가 ON인지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

모두 `true`여야 합니다!

---

## C) Edge Functions 로컬 구동

### 1. Supabase CLI 설치

```bash
# Windows (PowerShell)
scoop install supabase

# 또는 npm
npm install -g supabase
```

### 2. Supabase 초기화 (선택)

```bash
cd apps/edge

# 이미 설정되어 있으면 skip
supabase init
```

### 3. 로컬 Supabase 시작

```bash
# Docker가 실행 중이어야 합니다
supabase start

# 출력된 정보 확인:
# API URL: http://localhost:54321
# anon key: ...
# service_role key: ...
```

### 4. Edge Functions 실행

```bash
cd apps/edge

# 모든 함수 실행
supabase functions serve

# 특정 함수만 실행
supabase functions serve shipments-book
```

**실행 확인:**
```
Serving functions on http://localhost:54321/functions/v1/
  - shipments-book
  - payments-verify
  - videos-upload
```

---

## D) Admin(Next.js) 실행

### 1. 의존성 설치

```bash
cd apps/admin
npm install

# 또는
yarn install
```

### 2. 환경변수 확인

`apps/admin/.env.local` 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 확인

브라우저에서 http://localhost:3000 접속

- [x] 로그인 페이지 표시
- [x] 로그인 후 대시보드 이동
- [x] 주문 관리 메뉴 확인
- [x] 주문 상세 페이지 확인

---

## E) Mobile(Flutter) 실행

### 1. 더미 Firebase 설정 파일 생성

**Android: `apps/mobile/android/app/google-services.json`**

```json
{
  "project_info": {
    "project_number": "123456789",
    "project_id": "modu-repair-dev",
    "storage_bucket": "modu-repair-dev.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789:android:abc123",
        "android_client_info": {
          "package_name": "com.modusrepair.app"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyDummyKeyForDevelopment"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ]
}
```

**iOS: `apps/mobile/ios/Runner/GoogleService-Info.plist`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CLIENT_ID</key>
	<string>123456789-dummy.apps.googleusercontent.com</string>
	<key>GCM_SENDER_ID</key>
	<string>123456789</string>
	<key>PROJECT_ID</key>
	<string>modu-repair-dev</string>
	<key>STORAGE_BUCKET</key>
	<string>modu-repair-dev.appspot.com</string>
	<key>IS_ENABLED</key>
	<true/>
	<key>API_KEY</key>
	<string>AIzaSyDummyKeyForDevelopment</string>
</dict>
</plist>
```

### 2. .env 파일 생성

`apps/mobile/.env`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. 의존성 설치

```bash
cd apps/mobile
flutter pub get
```

### 4. 실행

```bash
# 연결된 디바이스 확인
flutter devices

# 실행
flutter run

# 특정 디바이스
flutter run -d chrome
```

### 5. 확인

- [x] 스플래시 화면 표시
- [x] 로그인 페이지 이동
- [x] 홈 화면 UI
- [x] 주문 목록/상세 UI

---

## F) 스모크 테스트

### 테스트 전 준비

```bash
# Edge Functions가 실행 중이어야 함
cd apps/edge
supabase functions serve
```

### 1. 결제 검증 (Mock)

```bash
curl -X POST http://localhost:54321/functions/v1/payments-verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "order_id": "ORD-TEST-001",
    "amount": 36000,
    "pg_tid": "T123",
    "imp_uid": "imp_123456789",
    "merchant_uid": "merchant_123"
  }'
```

**예상 응답:**
```json
{
  "verified": true,
  "payment": {...},
  "message": "결제가 완료되었습니다"
}
```

### 2. 송장 발급 (Mock)

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

**예상 응답:**
```json
{
  "tracking_no": "MOCK1234567890123",
  "status": "BOOKED",
  "message": "수거예약이 완료되었습니다"
}
```

### 3. 영상 업로드 (Mock)

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

**예상 응답:**
```json
{
  "video_id": "VIDEO123",
  "stream_url": "https://stream.cloudflare.com/.../video.m3u8",
  "message": "영상이 업로드되었습니다"
}
```

---

## G) Week 1 완료 기준

### Definition of Done

- [ ] **Supabase 설정**
  - [ ] 6개 테이블 생성 완료
  - [ ] RLS 활성화 확인
  - [ ] 관리자 계정 생성
  - [ ] Storage 버킷 생성

- [ ] **Edge Functions**
  - [ ] 로컬 구동 성공
  - [ ] 3개 API Mock 응답 200 OK
  - [ ] CORS 정상 작동

- [ ] **Admin Web**
  - [ ] 로그인 페이지 렌더
  - [ ] 대시보드 표시
  - [ ] 주문 목록/상세 UI 확인
  - [ ] 영상 업로드 컴포넌트 확인

- [ ] **Mobile App**
  - [ ] 로그인 UI 렌더
  - [ ] 홈/주문 목록 표시
  - [ ] 5단계 타임라인 UI 확인

- [ ] **문서**
  - [ ] docs/architecture.md 확인
  - [ ] docs/api-spec.md 확인
  - [ ] docs/database-schema.md 확인
  - [ ] docs/deployment.md 확인

- [ ] **보안**
  - [ ] .env 파일 Git 제외 확인
  - [ ] Firebase 설정 파일 제외 확인
  - [ ] 키 파일 제외 확인

---

## 🐛 트러블슈팅

### Supabase 연결 실패

```bash
# .env 파일 확인
cat .env | grep SUPABASE

# Supabase Dashboard에서 URL/Key 재확인
```

### Edge Functions 실행 안됨

```bash
# Docker 실행 확인
docker ps

# Supabase 재시작
supabase stop
supabase start
```

### Admin 빌드 에러

```bash
# node_modules 재설치
cd apps/admin
rm -rf node_modules
npm install
```

### Flutter 실행 안됨

```bash
# 캐시 정리
cd apps/mobile
flutter clean
flutter pub get
```

---

## 📸 완료 증빙

Week 1 완료 시 다음을 준비:

1. **스크린샷**
   - Supabase Tables 목록
   - Admin 대시보드
   - Mobile 앱 홈 화면
   - cURL 테스트 결과

2. **로그**
   - Edge Functions 실행 로그
   - Admin 실행 로그
   - Mobile 실행 로그

3. **체크리스트**
   - 이 문서의 모든 체크박스 완료

---

**마지막 업데이트**: 2025-01-24
**담당**: WEEK 1 Setup Team

