# 모두의수선 (Modo)

비대면 의류 수선 플랫폼 — 고객 웹, 어드민, Flutter 모바일 앱, Supabase Edge Functions 모노레포

---

## 프로젝트 구조

```
modo/
├── apps/
│   ├── web/          # 고객용 Next.js (modo.io.kr)
│   ├── admin/        # 어드민 Next.js (admin.modo.mom)
│   ├── mobile/       # Flutter 앱 (iOS / Android)
│   └── edge/         # Supabase Edge Functions + DB 마이그레이션
└── scripts/          # 유틸리티 스크립트
```

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 고객 웹 / 어드민 | Next.js 15, React 19, Tailwind CSS, TypeScript |
| 모바일 | Flutter 3, Dart, Riverpod |
| 백엔드 / DB | Supabase (PostgreSQL + Edge Functions / Deno) |
| 결제 | **PortOne V2** (`@portone/browser-sdk`, `@portone/server-sdk`, WebView 기반 모바일) |
| 배포 | Vercel (web · admin), Supabase (edge functions) |
| 인증 | Supabase Auth (Google · Naver · Apple · 이메일) |
| 물류 | 우체국 택배 API (수거 예약 / 취소) |

---

## 결제 (PortOne V2)

> 기존 토스페이먼츠(Toss Payments)에서 포트원 V2로 전면 마이그레이션 완료 (2026-06-30)

### 설정값

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_PORTONE_STORE_ID` | 포트원 Store ID |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 채널 키 (포트원 콘솔 > 채널 관리 — **단건결제 채널** 필요) |
| `PORTONE_API_SECRET` | API Secret (서버 전용) |
| `PORTONE_WEBHOOK_SECRET` | 웹훅 서명 검증 시크릿 |

> **채널 키 주의**: 빌링 전용 채널(`INIBillTst` 등)은 단건결제를 지원하지 않습니다.
> 카드 단건결제용으로 포트원 콘솔에서 **일반결제 채널**(예: `INIpayTest`)을 별도 등록해야 합니다.

### 결제 흐름

```
클라이언트 PortOne.requestPayment()
  → 포트원 결제창
  → redirectUrl 리다이렉트 (?paymentId=xxx)
  → payments-confirm Edge Function
      → GET https://api.portone.io/payments/{paymentId}
      → 금액/상태 검증 후 DB 업데이트
```

### 모바일 결제 방식

`portone_flutter` 1.0.x 는 Dart 3.10+ 를 요구합니다. 현재 Flutter 환경(3.35 / Dart 3.9.2)과 버전이 맞지 않아,
**WebView + PortOne V2 브라우저 SDK** 방식으로 구현되어 있습니다 (`portone_payment_page.dart`).

- `webview_flutter` 로 결제창 HTML 로드
- `redirectUrl` 가로채기로 결제 완료 감지
- 외부 앱 스킴(`intent://`, 카카오페이, 네이버페이 등) 자동 처리
- Dart SDK 가 3.10+ 로 업그레이드되면 `portone_flutter` 1.0.x 로 교체 가능

### 웹훅 URL

- 고객 웹: `https://modo.io.kr/api/pay/webhook`
- 어드민: `https://admin.modo.mom/api/pay/webhook`

### 지원 결제 수단

카드 · 가상계좌 · 계좌이체 · 카카오페이 · 네이버페이

### 마이그레이션 변경 이력

| 영역 | 변경 내용 |
|---|---|
| 웹 | `@tosspayments/tosspayments-sdk` → `@portone/browser-sdk` + `@portone/server-sdk` |
| 어드민 | `TossPaymentWidget` 삭제 → `PortonePaymentWidget` 신규 작성 |
| 모바일 | `tosspayments_widget_sdk_flutter` 제거 → WebView 기반 PortOne V2 결제창 |
| Edge Functions | Toss API 전면 → PortOne API (`https://api.portone.io`) |
| DB | `payment_key` 컬럼 → `payment_id` (마이그레이션 `20260630000000_portone_v2_payment_key_to_payment_id.sql`) |
| 웹훅 | Toss 이벤트 → PortOne V2 Standard Webhooks (`Transaction.Paid` 등) |

---

## 개발 환경 설정

### 사전 준비

- Node.js 20+
- Flutter SDK 3.x
- Supabase CLI
- Vercel CLI

### 웹 / 어드민

```bash
# 의존성 설치
cd apps/web && npm install
cd apps/admin && npm install

# 환경변수 설정
cp apps/web/.env.local.example apps/web/.env.local
# .env.local 에 실제 값 입력

# 개발 서버 실행
cd apps/web && npm run dev       # http://localhost:3001
cd apps/admin && npm run dev     # http://localhost:3000
```

### 모바일

```bash
cd apps/mobile

# 환경변수 설정
# apps/mobile/.env 에 PORTONE_STORE_ID, PORTONE_CHANNEL_KEY 입력

flutter pub get
flutter run
```

> Android 에뮬레이터: Android Studio AVD 또는 `flutter emulators --launch <id>`
> WebView 결제창은 Android / iOS 기기(에뮬레이터 포함)에서만 동작합니다 (Windows/Web 대상 빌드 제외).

### Edge Functions

```bash
cd apps/edge

# 로컬 환경변수 설정
supabase secrets set PORTONE_API_SECRET=xxx

# 함수 배포
supabase functions deploy payments-confirm --no-verify-jwt
supabase functions deploy payments-cancel --no-verify-jwt

# DB 마이그레이션
supabase db push
```

---

## 환경변수 (.env.local)

전체 목록: [`apps/web/.env.local.example`](apps/web/.env.local.example)

주요 항목:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# PortOne V2
NEXT_PUBLIC_PORTONE_STORE_ID=store-869df247-ae7f-4504-962a-299e69a6e255
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-...
PORTONE_API_SECRET=...
PORTONE_WEBHOOK_SECRET=...

# 네이버 로그인
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

---

## 배포

`main` 브랜치에 push하면 Vercel에서 자동 배포됩니다.

| Vercel 프로젝트 | 도메인 | 앱 |
|---|---|---|
| `modo-web` | modo.io.kr | 고객 웹 |
| `modo` | admin.modo.mom | 어드민 |

---

## DB 마이그레이션

```bash
cd apps/edge
supabase db push
```

마이그레이션 파일 위치: `apps/edge/supabase/migrations/`
