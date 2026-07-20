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

## PG 심사 대응 (`/shop`)

> NHN KCP PG사 심사 통과를 위한 샘플 상점 페이지 (2026-07-01 추가)

### 심사 기간 중 라우팅

- `modo.io.kr/` → `/shop` 자동 리다이렉트 (심사 완료 후 원복 필요)

### 샘플 페이지 구성

| 경로 | 설명 |
|---|---|
| `/shop` | 수선 서비스 목록 (로그인 불필요) |
| `/shop/checkout` | 주문 폼 + 우체국 수거 안내 + 주소 검색 + PortOne V2 결제 |
| `/shop/complete` | 주문 완료 페이지 |

- 왕복 배송비 7,000원 별도 표기
- 우체국 방문 수거 안내, 수선 전·후 사진 제공, 3~5 영업일 처리 기간 명시
- 결제 수단: NHN KCP 안전결제 · 신용/체크카드

### 심사 완료 후 원복 방법

`apps/web/app/page.tsx` 에서 주석 처리된 원래 코드를 살리고 `redirect('/shop')` 라인 삭제:

```tsx
// 이 라인 삭제:
redirect("/shop");

// 아래 주석 해제:
import { HomePageClient } from "@/components/home/HomePageClient";
import { PageLayout } from "@/components/layout/PageLayout";
export default function HomePage() {
  return (
    <PageLayout showAppBanner showIcons>
      <HomePageClient />
    </PageLayout>
  );
}
```

---

## 치수 재는 방법 · 이용 방법 가이드

PC(`lg`, 1024px 이상)에서만 중앙 앱(600px) **양옆 여백**에 사이드 위젯을 띄웁니다. 모바일·태블릿에서는 사이드 위젯이 나오지 않습니다.

### PC 사이드 위젯

| 위치 | 위젯 | 표시 범위 | 동작 |
|---|---|---|---|
| 왼쪽 | 치수 재는 방법 | 수거신청 **치수 입력** 단계만 | 아코디언 (`MeasureGuideSideWidget`) |
| 오른쪽 | 이용 방법 | **메인 포함 전 페이지** (루트 `layout.tsx` 마운트) | 아코디언, `sessionStorage`로 접힘 상태 유지 (`OrderHowToSideWidget`) |

이용 방법 위젯 핵심 안내:
- 수거신청 후 **원하는 날짜**에 **우체국택배**가 방문 수거
- 배송 완료: 수선이 끝난 의류를 **우체국 택배**로 발송

모바일(`< lg`):
- 치수 가이드 → 치수 입력 화면 안 아코디언
- 이용 방법 → `/guide/easy` 참고 (사이드 위젯 없음)

### 치수 가이드 매칭

- DB 컬럼: `repair_categories.measure_guide_key`, `repair_types.measure_guide_key`
- 어드민 **수선 메뉴** 편집에서 「치수 재는 방법 가이드」 선택
- 키가 없으면 항목/의류 이름으로 자동 추정 (`apps/web/lib/measure-guide.ts`)
- 마이그레이션: `apps/sql/migrations/add_measure_guide_key.sql`, `add_length_leg_width_guide.sql`

### 가이드 ID

| ID | 설명 |
|---|---|
| `sleeve-length` | 소매기장 줄임 |
| `shoulder` | 어깨길이 줄임 |
| `width-top` | 전체 품 줄임 (상의, 원피스) |
| `total-length-top` | 총 기장 줄임 (상의, 원피스) |
| `arm-width` | 전체팔통 줄임 |
| `total-length-bottom` | 총 기장 줄임 (바지, 스커트) |
| `waist-hip` | 허리/힙 줄임 |
| `leg-width` | 전체 통 줄임 (바지, 스커트) |
| `rise` | 밑위 줄임 |
| `length-leg-width` | **기장 + 밑통** — 총기장·전체 통 가이드를 드롭다운으로 둘 다 표시 |

관련 코드: `MeasureGuideClient`, `MeasureGuideAccordion`, `MeasureGuideSideWidget`, `OrderHowToSideWidget`, 어드민 `apps/admin/lib/measure-guide.ts`

---

## 친구 초대 적립

친구가 **초대 코드로 가입**하면 초대자에게 포인트가 지급됩니다. (기본 **1,000P**, 가입 시점 1회)

### 규칙

| 항목 | 내용 |
|---|---|
| 지급 대상 | 초대자 (코드를 공유한 사람) |
| 지급 시점 | 피초대자 **가입 완료** 시 (주문 완료 조건 아님) |
| 금액 | 어드민 설정 (`invite_settings.invite_reward_amount`, 기본 1000) |
| 만료 | 적립 시점 + 30일 |

### 초대 코드 입력 UI

| 경로 | 설명 |
|---|---|
| `/signup` | 회원가입 폼 「초대 코드 (선택)」. `?invite=CODE` 프리필 |
| `/login` | 소셜 가입 전 초대 코드 입력 (쿠키/localStorage 스태시) |
| `/profile/invite` | 가입 후 미적용 계정이면 「초대 코드 입력」 섹션 표시 |

공유 링크 예: `https://modo.io.kr/signup?invite=MODOXXXXXX`

### 어드민

- **설정 → 포인트 적립률 설정** 상단 「친구 초대 적립」 카드
- API: `GET/PATCH /api/invite/settings` (admin), `GET /api/invite/settings` (web 공개 조회)

### DB / RPC

- 마이그레이션: `add_invite_reward_system.sql`, `add_customer_email_to_point_transactions.sql`, `fix_manage_user_points_for_invite.sql`
- 테이블: `invite_settings`, `users.invite_code|invited_by|invite_count|invite_points_earned|invite_rewarded_at`
- RPC: `ensure_user_invite_code`, `apply_invite_on_signup` → 내부에서 `manage_user_points(..., 'EARNED', '친구초대 보상 (가입)')`

### 검증 (2026-07-20)

- invalid / self / empty 코드 → 거부
- 정상 적용 시 초대자 잔액 +1000P (트랜잭션 롤백으로 검증, 실데이터 미오염)
- 선행 이슈: 프로덕션 `point_transactions.customer_email` 미적용으로 적립 실패 → 컬럼·함수 수정 후 통과

관련 코드: `InviteClient`, `SignupPageClient`, `LoginPageClient`, `InviteBootstrap`, `apps/web/app/api/invite/*`

---

## 결제 시 포인트 사용

결제 페이지(`/payment?intentId=...`)에서 보유 포인트를 결제 금액에 사용할 수 있습니다.

| 규칙 | 내용 |
|---|---|
| 최저 사용 | **1,000P** 이상일 때만 사용 가능 (보유·사용액 모두) |
| 적용 시점 | 결제 전 인텐트에 예약 차감 (`USED`), `total_price` 감소 |
| 전액 포인트 | 잔액 0원이면 PortOne 없이 `complete-with-points`로 주문 생성 |
| 취소 복구 | 주문 취소 성공 시 `USE_RESTORE`로 포인트 환급 |

- API: `POST /api/payment-intents/[id]/apply-points`, `.../complete-with-points`
- RPC: `apply_points_to_payment_intent`, `restore_order_points_used`
- 마이그레이션: `add_points_use_enum.sql`, `add_points_use_at_checkout.sql`
- UI: `PaymentClient` 「포인트 사용」 카드

---

## 알려진 이슈 / 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-07-20 | 결제 시 포인트 사용 | 결제 화면에서 포인트 사용(최저 **1,000P**). 인텐트에 예약 차감 후 PortOne 금액 반영, 전액 포인트 시 PG 없이 주문 생성. 주문 취소 시 `USE_RESTORE`로 복구 |
| 2026-07-20 | 친구 초대 적립 | 가입 시 초대자 포인트 지급(기본 1000P, 어드민 설정). 회원가입·로그인(소셜)·친구초대 페이지에서 초대코드 입력. `customer_email` 누락으로 `manage_user_points` 실패하던 문제 수정 후 DB 검증 통과 |
| 2026-07-20 | 치수·이용방법 위젯 | 수선 항목별 가이드 연결(`measure_guide_key`). PC(`lg`+) 전용 사이드 위젯: 왼쪽 치수(치수 입력 시) / 오른쪽 이용방법(**메인·전 페이지**, 아코디언). 원하는 날짜·우체국택배 수거·반송 강조. `length-leg-width` 복합 가이드. 치수 입력 뒤로가기 시 세부 부위 복귀 |
| 2026-07-08 | 결제 취소 시 우체국 접수 미취소 수정 | 어드민 `/api/pay/cancel`(결제 취소 다이얼로그) 및 PortOne 웹훅 `Transaction.Cancelled`에서 `BOOKED` 상태 주문의 우체국 수거 접수를 취소하지 않던 문제 수정. 이제 수거 전 전체 취소 시 `shipments-cancel` Edge Function 자동 호출 |
| 2026-07-08 | 수선 항목 부분 취소 기능 추가 | 고객·관리자 모두 여러 수선 항목 중 일부만 선택해서 취소 가능. 취소 항목 금액만 환불(배송비 유지). 전 항목 취소 시 전체 취소와 동일 처리(수거 전: 우체국 접수 취소+전액 환불, 수거 후: 수선 항목 금액만 환불+반송). DB 마이그레이션: `orders.canceled_repair_parts integer[]` 컬럼 추가 (`apps/sql/migrations/add_cancel_items.sql`). API: `POST /api/orders/[id]/cancel-items` (web·admin). UI: 고객 주문 상세 수선 항목 카드에 "항목 취소" 버튼·다이얼로그, 어드민 주문 상세 주문 정보 카드에 "항목 취소" 버튼 추가 |
| 2026-07-07 | FCM 탭 딥링크 오류 수정 | 푸시 알림 탭 시 `/orders/detail/:id` (존재하지 않는 경로) → `/orders/:id`로 수정. GoRouter 실제 경로와 일치 |
| 2026-07-07 | 수거완료(PICKED_UP) 상태 누락 수정 | `shipments-track`에서 우체국 수거 완료 시 `orders.status`를 `INBOUND`로 덮어쓰던 문제 → `PICKED_UP`으로 변경. `INBOUND`는 센터 작업자 수동 입고 처리 시에만 설정 |
| 2026-07-07 | 모바일 주문 상태 오표시 수정 | `OrderStatus` enum에 `PICKED_UP`, `OUT_FOR_DELIVERY`, `RETURN_SHIPPING`, `RETURN_DONE` 추가. 누락 상태 시 "수거예약"으로 잘못 표시되던 문제 해소 |
| 2026-07-07 | 웹 HOLD 상태 표시 누락 수정 | `ORDER_STATUS_MAP`에 `HOLD`(추가결제 대기) 추가. 타임라인 `DB_STATUS_STEP`에 HOLD·RETURN_* 매핑 추가 |
| 2026-07-07 | 작업자 추가비용 요청 시 관리자 알림 미전송 수정 | `ops/extra-charge/route.ts`의 TODO 구현. 작업자가 요청하면 MANAGER/ADMIN/SUPER_ADMIN 전원에게 알림 DB 저장 + FCM 푸시 발송 |
| 2026-07-07 | 모바일 의류 SVG 아이콘 적용 | 주문 목록 카드에 의류 종류(청바지·바지·원피스·치마·티셔츠·셔츠·아우터·정장·니트·가죽)에 맞는 SVG 아이콘 표시. 웹과 동일한 키워드 매핑 |
| 2026-07-07 | 배송완료 자동 폴링 Cron 추가 | `poll-delivery-tracking` Edge Function 신규 배포. pg_cron으로 KST 08:00~20:30 매 30분마다 `OUT_FOR_DELIVERY` 주문 자동 추적 → `DELIVERED` 자동 전환 |
| 2026-07-07 | SUPER_ADMIN 추가결제 직접 요청 DB 수정 | `request_extra_charge` RPC에 `SUPER_ADMIN` 역할 추가 (기존: MANAGER/ADMIN만 직접 청구 가능) |
| 2026-07-06 | 결제 완료 알림 한글 깨짐 | `payments-confirm` Edge Function 파일 인코딩 오류로 한글이 `??`로 저장 → 파일 전체 UTF-8 재작성. 기존 깨진 알림은 Supabase에서 직접 수정 필요 |
| 2026-07-06 | 결제 취소 후 주문 상태 미변경 | `pay/cancel` API·`webhook` (`Transaction.Cancelled`) 전체 취소 시 `orders.status`를 `CANCELLED`로 업데이트하지 않던 문제 수정 |
| 2026-07-06 | 취소/반송 보기 목록 0건 표시 | 통계는 날짜 필터 없이 전체, 목록은 30일 필터 적용 → 불일치. 취소/반송 보기에서 날짜 필터 제거 |
| 2026-07-06 | 어드민 원시값 UI 일괄 수정 | 주문 상세·대시보드·고객 상세·결제 관리에서 `PROCESSING`, `PaymentMethodCard`, `PAID` 등 코드값이 그대로 노출되던 문제를 한글 레이블로 변환 |
| 2026-07-06 | 결제 취소 다이얼로그 결제수단 원시값 | `PaymentMethodCard` → `신용카드` 등 PortOne V2 타입명 매핑 추가 (`payment-refund-dialog.tsx`, `payments/page.tsx`) |
| 2026-07-06 | 주문 타임라인 취소/반송 상태 미표시 | `CANCELLED`, `RETURN_PENDING`, `RETURN_SHIPPING`, `RETURN_DONE` 상태에서 모든 단계가 회색으로 표시되던 문제 수정. 해당 상태 전용 배너 표시 |
| 2026-07-06 | 취소/반송 보기 전체화면 스피너 | `cancelView` 모드 진입 시 `stats === null` 조건으로 전체화면 로딩 스피너가 계속 뜨던 문제 수정 |
| 2026-07-06 | analytics stats 날짜 필터 무시 | `/api/analytics/stats`의 `getOrderStats`, `getPaymentStats` 함수가 `startDate`/`endDate` 파라미터를 받되 실제 쿼리에 적용하지 않던 문제 수정 |
| 2026-07-01 | PG 심사용 샵 페이지 추가 | `/shop` · `/shop/checkout` · `/shop/complete` 신규 추가, 루트 `/` → `/shop` 임시 리다이렉트 |
| 2026-07-01 | 전화번호 저장 409 충돌 | `users_phone_unique` 인덱스가 문자열 그대로 비교하여 `010-2723-9490` ≠ `01027239490` 로 처리. 저장 시 하이픈·공백 제거 정규화 적용 (`AccountClient.tsx`), DB 중복 레코드 정리 |
| 2026-07-01 | 수선신청 FAB 버튼 텍스트 줄바꿈 | 좁은 화면에서 "수선신청 하기" 텍스트가 줄바꿈 되던 문제. `whitespace-nowrap` + `clamp()` 로 비율적 축소 처리 |
| 2026-06-30 | CSP 위반으로 결제창 차단 | PortOne V2 관련 도메인(`cdn.portone.io`, `*.iamport.co`, `*.kcp.co.kr` 등) CSP 누락 → `next.config` 양쪽 모두 추가 |
| 2026-06-30 | PortOne 채널 키 타입 불일치 | 빌링 전용 채널(`INIBillTst`)을 단건결제에 사용 시 `INVALID_REQUEST` 오류. 일반결제 채널 키로 교체 |

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
