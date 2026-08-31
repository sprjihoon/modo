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
| 이메일 | **Resend** (주문 상태 · 운영 아침 리포트 · 신규 주문/가입 알림) |

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

### 모바일 결제 방식 (PortOne V2 + NHN KCP)

`portone_flutter` 대신 **WebView + PortOne V2 브라우저 SDK** 방식 (`portone_payment_page.dart`).
PG는 웹과 동일하게 **NHN KCP 단건결제 채널**을 사용합니다.

- `webview_flutter` 로 결제창 HTML 로드
- `redirectUrl`(`https://modo.io.kr/payment/mobile-callback`) 가로채기로 결제 완료 감지
- `appScheme`: `modorepair://` (카드사 앱 복귀용)
- **KCP `paymentId`**: UUID 하이픈 제거 (영문/숫자만, 웹 `PaymentClient`와 동일)
- `about:blank` 등 WebView 내부 네비게이션 허용 (막으면 결제창 로딩에 멈춤)
- 빈 `customer` 필드는 요청에서 제외 (KCP 파싱 오류 방지)
- 외부 앱 스킴(`intent://`, 카카오페이, 네이버페이 등) → `url_launcher`
- 모바일 `.env`의 `PORTONE_CHANNEL_KEY`는 웹 라이브(modo.io.kr)와 동일 채널 사용

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

### 라우팅

- 홈(`/`)은 고객 랜딩. `/shop`은 PG 심사용 샘플 상점(로그인 불필요)

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

모바일(`< lg`) · Flutter 앱:
- 치수 입력 순서: 입력 필드 → **이전/확인** → **치수 재는 방법** 아코디언 (버튼이 가이드에 가려지지 않도록 가이드 **위**에 배치)
- 웹: `MeasureGuideAccordion` → `MeasureGuideClient` (일상적인 방법 / 잘맞는 옷과 비교 방법 탭)
- 앱: 같은 `MeasureGuideAccordion`을 **네이티브**로 그림. WebView 임베드는 쓰지 않음 (높이 잘림 방지). 그림은 `https://modo.io.kr/images/measure/…`
- 수선 항목이 정해지면 그 항목의 일상·비교 안내만 보임 (전 종류를 한 탭에 쌓지 않음)
- 이용 방법 → `/guide/easy` 참고 (사이드 위젯 없음)

### 치수 가이드 매칭

- DB 컬럼: `repair_categories.measure_guide_key`, `repair_types.measure_guide_key`
- 어드민 **수선 메뉴** 편집에서 「치수 재는 방법 가이드」 선택
- **항목 이름이 우선.** 카테고리에 상의 총기장·소매 키가 남아 있어도 허리/통/밑위/어깨 등이 그 가이드로 나오지 않음
- 의류가 하의(바지·청바지·치마·스커트)이면 상의 기장 키를 하의 기장으로 바꿈. 상의·원피스·아우터 총기장은 상의 가이드
- 정장/수트: 소매·어깨·품·총기장 → 상의, 기장 줄임·허리·통 → 하의
- 웹·앱 동일 규칙  
  - 웹: `apps/web/lib/measure-guide.ts`  
  - 앱: `apps/mobile/lib/core/measure_guide.dart`
- 단독/임베드 페이지: `/guide/measure`, `/guide/measure?embed=1` (앱바 없음). 앱은 더 이상 WebView로 이 페이지를 넣지 않음
- 마이그레이션: `apps/sql/migrations/add_measure_guide_key.sql`, `add_length_leg_width_guide.sql`
- 검증: `cd apps/web && npx tsx lib/measure-guide.test.ts` · `cd apps/mobile && flutter test test/measure_guide_test.dart`

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

## 회원가입 적립

신규 고객이 **가입**하면 축하 포인트가 자동 지급됩니다. (기본 **1,000P**, 1회, 웹·앱·OAuth 공통)

| 항목 | 내용 |
|---|---|
| 지급 대상 | 신규 `CUSTOMER` |
| 지급 시점 | `users` 행 생성 시 (DB 트리거) |
| 금액 | 어드민 설정 (`invite_settings.signup_reward_amount`, 기본 1000) |
| 만료 | 적립 시점 + 30일 |
| 멱등 | `users.signup_rewarded_at` (기존 회원은 소급 지급 없음) |

어드민: **포인트 관리 → 포인트 설정** 「회원가입 적립」 카드 (`/dashboard/points?tab=settings`)  
RPC: `grant_signup_reward` / 마이그레이션: `add_signup_reward.sql`

---

## 친구 초대 적립

친구가 **초대 코드로 가입·적용**하면 **초대자와 피초대자 모두** 포인트가 지급됩니다. (각 기본 **1,000P**, 1회)

### 규칙

| 항목 | 내용 |
|---|---|
| 지급 대상 | 초대자(코드 공유) + 피초대자(코드 입력) |
| 지급 시점 | 피초대자 **가입/코드 적용** 시 (주문 완료 조건 아님) |
| 금액 | 어드민 설정 (`invite_reward_amount` / `invitee_reward_amount`, 각 기본 1000) |
| 만료 | 적립 시점 + 30일 |

### 가입 흐름 (웹 가입 → 앱 설치)

초대·신규 가입은 **웹에서 끝내고**, 앱은 설치 후 같은 계정으로 로그인한다.

1. 공유 링크 `https://modo.io.kr/signup?invite=CODE` (카톡 미리보기 `og.jpg` 1200×600 2:1, ~62KB)
2. 웹에서 이메일 또는 카카오·네이버 등으로 가입 → 초대 코드 적용
3. `/download?joined=1` 에서 앱 설치 안내
4. 앱 「웹에서 가입」은 위 웹 가입 페이지를 연다. 앱 안에서는 로그인만 한다.

| 경로 | 설명 |
|---|---|
| `/signup` | 웹 가입. 「초대 코드 (선택)」·`?invite=CODE` 프리필·간편가입 |
| `/login` | 웹 로그인. 초대 코드 입력란은 없음 (`?invite=`는 가입 페이지로 유지) |
| `/download?joined=1` | 가입 완료 후 앱 설치 유도 |
| `/profile/invite` | 가입 후 미적용 계정이면 「초대 코드 입력」 |
| 앱 `/signup` | 웹 가입 페이지를 연다 |

공유 링크 예: `https://modo.io.kr/signup?invite=MODOXXXXXX`

### 어드민

- **포인트 관리 → 포인트 설정** 「회원가입 적립」·「친구 초대 적립」 카드 (`/dashboard/points?tab=settings`)
- 예전 `/dashboard/settings/points`는 위 화면으로 리다이렉트
- API: `GET/PATCH /api/invite/settings` (admin), `GET /api/invite/settings` (web 공개 조회)

### DB / RPC

- 마이그레이션: `add_invite_reward_system.sql`, `add_customer_email_to_point_transactions.sql`, `fix_manage_user_points_for_invite.sql`
- 테이블: `invite_settings`, `users.invite_code|invited_by|invite_count|invite_points_earned|invite_rewarded_at`
- RPC: `ensure_user_invite_code`, `apply_invite_on_signup` → 내부에서 `manage_user_points(..., 'EARNED', '친구초대 보상 (가입)')`

### 검증 (2026-07-20)

- invalid / self / empty 코드 → 거부
- 정상 적용 시 초대자 잔액 +1000P (트랜잭션 롤백으로 검증, 실데이터 미오염)
- 선행 이슈: 프로덕션 `point_transactions.customer_email` 미적용으로 적립 실패 → 컬럼·함수 수정 후 통과

관련 코드: `InviteClient`, `SignupPageClient`, `SocialAuthButtons`, `DownloadPageClient`, `InviteBootstrap`, `apps/web/app/api/invite/*`, 앱 `signup_page.dart`

---

## 고객 리뷰

배송완료(`DELIVERED`) 주문에 한해 고객이 리뷰를 남긴다. **웹은 라이브**. 앱은 `1.0.5` 판매 중 · `1.0.6+37`에 가이드·세부항목 포함(스토어는 심사 통과 후).

| 항목 | 내용 |
|---|---|
| 작성 | 웹 `/orders/[id]/review` · 앱 `/orders/:orderId/review`. 별점 정수 1~5(기본 5), 글 + 사진(최대 5장). 주문당 1개 |
| 공개 | 작성 직후 `pending`. 작성자는 즉시 조회. 타인에게는 어드민 승인 후만 공개 |
| 이름 | 실명 마스킹 `장**`. 닉네임 없음 |
| 포인트 | 글 200P / 포토 500P (어드민 변경). 제출 시 지급. 숨김·삭제해도 회수 없음. 같은 주문 재작성 시 재지급 없음 |
| 홈 | 웹·앱 모두 **가격표/쉬운가이드 → 내 주문 → 고객 리뷰**. 주문 없으면 「아직 주문 내역이 없어요」(비로그인: 「로그인하고 수선을 시작해 보세요」). 리뷰는 DB `reviews`만 (`/api/reviews?home=1`, 목업 없음). 관리자가 고른 순서(`is_featured`, `display_order`). 사진 2 + 글 2, 사진 없으면 글 4. 홈·전체 목록에 **총점·공개 개수는 안 냄**. 공개 리뷰 없으면 「아직 공개된 리뷰가 없습니다」. 운영에는 텍스트 4건이 들어가 있음 |
| 배너 | 웹·앱 홈 배너 높이 **200** |
| 전체 | `/reviews` 별점순·최신순·포토리뷰(`?photo=1`)·**수선 종류**(의류 대분류, `?clothing=바지`). 포토는 사진 리뷰가 있을 때만 목록에 나옴. 로그인 시 맨 위 **내 리뷰** |
| 내 리뷰 | `/profile/reviews`에서 수정·삭제. 수정 시 다시 검수 대기 |
| 어드민 | `/dashboard/reviews` 승인·숨김·삭제·홈 노출 순서. 적립은 `/dashboard/points?tab=reviews` |
| 앱 API | 쿠키 또는 `Authorization: Bearer` (`apps/web/lib/auth-user.ts`). 앱은 `https://modo.io.kr/api/...` |

SQL: `19_reviews.sql`, `20260829000000_add_reviews.sql`, `20260830000000_review_home_featured.sql`, `20260830010000_reviews_curated_and_seed.sql`, `20260830020000_reviews_clothing_type.sql` (운영 DB 반영). 버킷 `review-images`. 샘플 문구는 `/reviews/design`·앱 단위 테스트에만.

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

## 앱스토어 / Play 출시 준비

**지금:** 코드는 `main`의 `1.0.6+39`. iOS는 `1.0.6` 빌드 39로 심사 교체. Play 프로덕션은 **38 게시됨**, 업로드용 AAB는 **39**. 명령은 `apps/mobile/README.md`에도 같다.

| 항목 | 값 |
|---|---|
| 앱 이름 | 모두의수선 |
| Bundle / Application ID | `com.modurepair.app` |
| 버전 | `apps/mobile/pubspec.yaml` → **`1.0.6+39`**. iOS 심사 39 · Play 업로드용 39 (홈 수거신청 버튼·상단 로그인 제거) |
| App Store Connect App ID | `6759492888` |
| iOS 스토어 | **판매 중 `1.0.5`**. **`1.0.6` 빌드 39 제출** · https://apps.apple.com/kr/app/모두의수선/id6759492888 |
| Play 개발자 계정 | 틸리언 (개인) · Account ID `6272621754721589639` · 본인 확인 완료 |
| Play App ID | `4975768727608817713` |
| Play 상태 | **프로덕션 게시됨** `1.0.6 (38)` · 대한민국 · https://play.google.com/store/apps/details?id=com.modurepair.app · Alpha opt-in `https://play.google.com/apps/testing/com.modurepair.app` |
| Play 내부 테스트 | 활성 · 링크 `https://play.google.com/apps/internaltest/4701702425484954622` · 테스터 목록「내부 테스터」 |
| Play 비공개 테스트 | Alpha 트랙 `4700584948698883440` · 국가 ~176 · 동일 테스터 목록 |
| Android AAB | `1.0.6+39` · 백업 `Documents/modo-android-signing/app-release-1.0.6+39.aab` |
| Android 업로드 서명 | 로컬 JKS SHA1 `10:90:55…` (Play 업로드 키 재설정 완료) · 기기 배포 서명 SHA1 `D7:A9:03…` · `key.properties`+`upload-keystore.jks` Git 제외 |
| 스토어 문구 | `apps/mobile/STORE_LISTING_KR.md` |
| 스토어 그래픽 | `apps/mobile/store_screenshots/play/` (아이콘·피처·폰 스크린샷) |
| 개인정보처리방침 | https://modo.io.kr/privacy-policy |
| 계정 삭제(Data safety) | https://modo.io.kr/profile/account |
| 이용약관 | https://modo.io.kr/terms (`app_contents.terms_of_service`) |
| 결제·취소·환불 정책 | https://modo.io.kr/refund-policy (`app_contents.refund_policy`) |
| 앱 다운로드 안내 | https://modo.io.kr/download (iOS 앱스토어 · Play 프로덕션) |
| Apple Team | `6R7TSV8PV4` |
| iOS 수출규정 | `ITSAppUsesNonExemptEncryption = false` (표준 HTTPS만 사용) |
| Xcode Cloud Flutter | `ios/ci_scripts/ci_post_clone.sh` 핀 **3.35.7** — 공식 macOS zip 설치 (`pubspec.lock` `>=3.35.0`). `*.sh`는 LF 고정 (`.gitattributes`) |
| Xcode Cloud 서명 | Runner Manual(`ModoRepair AppStore`) + Team `6R7TSV8PV4`. `AppFrameworkInfo.plist` `MinimumOSVersion=15.0` |
| Xcode Cloud 기기 | Developer 계정에 **iPhone 1대 이상** 등록 필수. 없으면 Dev/Ad Hoc export가 실패해 Archive 전체가 FAILED로 표시되고 TestFlight 자동 업로드가 막힘 ([Devices](https://developer.apple.com/account/resources/devices/list)) |
| App Store 현재 빌드 | 판매 중 **`1.0.5`**. **`1.0.6` 빌드 39** 제출 |
| 앱 업데이트 안내 | `app_versions`. 지금 최신은 iOS/Android 모두 **`1.0.2`**. 「업데이트 확인」은 이 값과 비교. iOS `1.0.6`이 앱스토어에 나온 뒤에만 어드민 최신을 올린다. Play만 먼저 올리면 아이폰이 아직 없는 업데이트를 안내함 |
| 알림 설정 이동 | 로그인 후 알림이 꺼져 있으면 안내. Android는 앱 알림 설정, iOS는 해당 앱 설정 |

### 심사용 테스트 계정

이메일 로그인으로 심사팀이 앱에 들어갈 수 있는 계정입니다. App Store Connect · Play Console 앱 콘텐츠(로그인 세부정보)에 동일하게 등록합니다.

| 항목 | 값 |
|---|---|
| 이메일 (사용자 이름) | `apple-review@modo.io.kr` |
| 비밀번호 | `ModoReview2026!` |
| 이름 | App Store Reviewer |
| 비고 | `profile_completed=true`, 이메일 인증 완료. 삭제·비활성화하지 말 것 |
| 심사 연락처 | 장지훈 / `vovok@naver.com` / `+82 10-2723-9491` |

### 빌드

```bash
cd apps/mobile

# Android (Play용 AAB — 권장)
flutter build appbundle --release
# → build/app/outputs/bundle/release/app-release.aab

# Android (직접 설치용 APK — Play Protect 경고가 날 수 있음, 신규 서명 키는 흔함)
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk

# iOS (App Store / TestFlight)
flutter build ipa --release --build-name=1.0.6 --build-number=37 \
  --export-options-plist=ios/ExportOptions.plist
# → build/ios/ipa/모두의수선.ipa
# 업로드: xcrun altool --upload-app --type ios -f build/ios/ipa/*.ipa \
#   --apiKey 5NS9QNDJUH --apiIssuer <issuerId>
```

### 맥북에서 `1.0.6+38` (치수 가이드 · Play 사진 권한)

Windows에서는 IPA/AAB를 만들지 않는다. `pubspec.yaml`은 `1.0.6+38`.

이 빌드에 포함된 앱 수정:
- 치수 재는 방법이 웹과 같이 **일상적인 방법 / 잘맞는 옷과 비교 방법** 탭
- WebView 대신 네이티브 위젯. 바깥 화면과 같이 스크롤되어 아래가 잘리지 않음
- 선택한 수선 항목의 안내만 표시
- **항목·의류에 맞는 가이드.** 바지·청바지·치마 기장에 상의 가이드가 나오던 문제. 소매/어깨/품/허리/통/밑위/기장+밑통도 이름 기준으로 맞춤
- 단일 선택 세부부위는 탭하면 바로 치수 입력(또는 담기)
- 부속품처럼 카드가 많은 항목도 확인/다음 버튼이 화면에 남음
- 수선항목이 1개면 선택 완료 후 웹과 같이 자동 다음
- 치수 화면이 세부부위 뒤에 가려지지 않음
- **전체** 선택 시에만 전체 옵션 가격 표시
- 홈 내 주문과 고객 리뷰 사이 여백

`1.0.5`는 판매 중. 같은 버전 트레인에 올릴 수 없어 **1.0.6 / 37**으로 제출한다.

```bash
git checkout main
git pull
cd apps/mobile
flutter pub get

# Play AAB
flutter build appbundle --release --build-name=1.0.6 --build-number=38
# → build/app/outputs/bundle/release/app-release.aab
# 백업: ~/Documents/modo-android-signing/app-release-1.0.6+38.aab

# App Store / TestFlight IPA
flutter build ipa --release --build-name=1.0.6 --build-number=37 \
  --export-options-plist=ios/ExportOptions.plist
# → build/ios/ipa/모두의수선.ipa
```

iOS **1.0.6(37)** 심사 중. Play는 **38** AAB(`READ_MEDIA_*` 제거). 스토어에 `1.0.6`이 나온 뒤에만 어드민 **앱 버전** 최신을 바꾼다.

서명 키는 맥북 `~/Documents/modo-android-signing/upload-keystore.jks` (Play 업로드 SHA1 `10:90:55…`). Windows PC의 8/3 키(`AE:84:3D…`)로 만든 AAB는 Play에 올리지 않는다.

### 체크리스트

1. ~~App Store Connect 앱 등록~~ (`com.modurepair.app` / App ID `6759492888`)
2. ~~심사용 로그인 정보~~ (`apple-review@modo.io.kr`)
3. ~~iOS 빌드 업로드·심사 제출~~ (빌드 **9** · `WAITING_FOR_REVIEW` → **10**으로 교체)
4. ~~Play 앱 생성·내부 테스트·스토어/앱 콘텐츠~~ (`com.modurepair.app` / App ID `4975768727608817713`)
5. ~~Play 비공개 테스트(Alpha) `1.0.0 (4)` 게시 개요 제출~~
6. ~~`1.0.0+5` SafeArea AAB Play Alpha 교체·검토 제출~~ (하단 내비 inset · 수선부위 그리드 핏)
7. ~~웹·앱 알림 UX~~ (`/notifications` 내 알림·공지 탭, 본문 ORD 주문번호 숨김. 개인 알림은 읽으면 숨김. **공지는 읽어도 목록에 유지**, 상세 `/announcements/:id`)
8. ~~수선신청 UX~~ (소카테고리 가격 라벨 제거, 가격표 CTA 연결, 참고 안내 배너 제거)
9. ~~`1.0.0+8`~~ (라이트 테마 · 네이버 · 가격표 배너 제거 · 홈 팝업 앱 연동)
10. ~~ITMS-90068 / 빌드 9~~ · **`1.0.0+10`** 회원가입 SNS(Google/네이버/카카오) 연결 · Play Alpha AAB·App Store 빌드 교체
11. ~~`1.0.1+14` Android 네이버 로그인 R8 수정~~ (Play Alpha AAB 교체)
12. ~~`1.0.1+15` OAuth 취소 시 「로그인 중」 무한 로딩 수정~~ (Play Alpha)
13. ~~`1.0.1+16` App Store 거절 대응~~ (5.1.1 / 2.1 Apple / 2.3.10) · Play Alpha·ASC 재제출
14. ~~`1.0.1+18` Play targetSdk 36~~ (`compileSdk`/`targetSdk` 고정 · Alpha **활성**)
15. ~~`1.0.1+19` 게스트 둘러보기·iPad Safari Apple 로그인~~ (5.1.1 / 2.1)
16. ~~`1.0.1+20` 재심사 리스크 3건~~ (웹 세션 Apple 로그인 · 첫 실행 권한 제거 · 실제 비밀번호 변경)
17. ~~`1.0.1+21` 가격 탭 가운데 정렬 · 수선 확인 널 가드 · 2.1 긴 화면 녹화~~ · **App Store 승인·출시 · Play Alpha 21**
18. ~~`1.0.1+22` 어드민 CS 처리~~ (재작업·수선비 환불·전손 보상 · 고객 회차 표시)
19. **`1.0.2+25` 업데이트 안내 · 알림 설정 이동** (`app_versions` · 어드민 앱 버전 · iOS 빌드 25 심사 대기 · Play Alpha AAB 25 업로드)
20. **`1.0.2+26` 치수 가이드 스크롤** (코드만. 스토어 업로드 전에 27로 흡수)
21. ~~`1.0.2+27` 고객 수치 저장~~ → 맥북에서 **`1.0.3+29`** 로 올림 (iOS 판매 중 · Play Alpha 29 검토 중)
22. ~~`1.0.3+30` 가격안내 순서~~ → **`1.0.4+31`에 흡수** (장바구니 담기 + 3단계 담기 제거 + 포인트 intent 숨김)
28. ~~`1.0.4+31` 웹 가입·초대~~ → **`1.0.4+32`에 흡수**
29. ~~`1.0.4+32` 결제 전 수치 · 수치 이전~~ → **`1.0.4+33`에 흡수**
30. ~~`1.0.4+33` 공지 상세 라우트~~ → **`1.0.4` 판매 중**
31. ~~`1.0.5+34` 앱 리뷰 · 홈 순서~~ → **`1.0.5+35`에 흡수** (목업 폴백 제거 · DB만)
32. ~~`1.0.5+35` 리뷰 DB 전용~~ → **`1.0.5+36`에 흡수**
33. ~~`1.0.5+36` 수선 종류 필터~~ — **`1.0.5` 판매 중**
34. **`1.0.6+37` 치수 가이드 · 세부항목** — 네이티브 치수 가이드 · 세부부위 즉시 다음. iOS 37 심사 중
35. ~~`1.0.6+38` Play 사진 권한~~ — `READ_MEDIA_*` 제거. **Play 프로덕션 게시**(2026-08-31, 대한민국)
23. 비공개 테스트 테스터 opt-in · 실기기 **SNS 가입/로그인**(네이버 포함)·주문·**라이브 결제** 스모크 · **iOS Apple 로그인 실기기 확인**
24. ~~Play 프로덕션 액세스~~ — **게시됨** (2026-08-31). `/download` Play URL 연결
25. ~~네이버 서치어드바이저~~ (소유확인 · 사이트맵 제출 · 홈 수집 요청, 2026-08-18)
26. ~~Google Search Console~~ (소유확인 · 사이트맵 제출, 2026-08-18)
27. ~~의류 전손·분실 보상 기준~~ (`app_contents` 제15조·환불정책 제6·7조, 2026-08-19)

### 검색 (`modo.io.kr`)

| 항목 | 값 |
|---|---|
| Google Search Console | 소유확인 (`google-site-verification`, 계정 `vovok112@gmail.com`) |
| 네이버 서치어드바이저 | 소유확인 완료 (HTML 메타 `naver-site-verification`) |
| 사이트맵 | https://modo.io.kr/sitemap.xml (`apps/web/app/sitemap.ts`) |
| robots | https://modo.io.kr/robots.txt — Yeti 허용 · `/cart` `/payment` `/profile` `/orders` `/api` 등 차단 |
| 수집 요청 | 홈 `/` (2026-08-18) |
| 노출 | 보장 없음. 보통 1~2주 |

### 약관 / 콘텐츠 (`app_contents`)

웹·앱 약관은 DB `app_contents`에서 읽는다. 어드민 **콘텐츠**에서 수정. 페이지: `/terms` `/privacy-policy` `/refund-policy`.

| 키 | URL | 비고 |
|---|---|---|
| `terms_of_service` | `/terms` | 제15조 손해배상 (2026-08-19 개정) |
| `privacy_policy` | `/privacy-policy` | |
| `refund_policy` | `/refund-policy` | 제6·7조 전손·분실 보상 |

**전손·분실 보상 (회사 귀책만):** `min(잔존가치, 해당 주문 수선비×5, 20만 원)`. 20만 원은 1건당 한도(정액 지급 아님). 수선 실패(재작업 가능)는 재작업 또는 수선비 환불. 리셀 시세·희소성 제외. 신청 시 가치 신고 절차 없음.

SQL: `apps/sql/migrations/20260819_update_damage_compensation.sql` (라이브 반영됨)

### 홈 팝업 (`popups`)

웹·앱 홈이 같은 `popups` 행을 읽는다. 어드민 **콘텐츠 → 팝업 관리**. 활성 1건(`display_priority` 내림차순). 「오늘 그만보기」는 로컬 자정까지.

**지금 (2026-08-31):** 그랜드 오픈. 웹은 확인 버튼 없음(X·배경·오늘 그만보기만). 앱은 스토어 빌드가 버튼을 항상 그려서 DB 문구를 유지한다. 앱에서 버튼을 빼려면 다음 스토어 빌드가 필요하다. iOS는 항목에 `Android`가 있으면 숨김(2.3.10).

| 항목 | 문구 |
|---|---|
| 상단 | `GRAND OPENING` |
| 제목 | 모두의수선 그랜드 오픈 (`그랜드 오픈` 강조) |
| 1 | 모든 서비스 정상 가동 — 접수부터 결제, 수거, 배송까지 웹과 앱에서 지금 바로 이용하세요. |
| 2 | 문 앞에 두기만 하면 됩니다 — 원하는 날에 우체국택배가 방문 수거하고, 수선이 끝나면 다시 집으로 보내드려요. |
| 버튼 | 웹 없음. 앱은 닫기용으로 유지 |

---

## 주문 상태 이메일 (Resend)

주문 상태가 바뀌면 FCM 푸시와 같은 문구로 가입 이메일에 Resend 메일을 보낸다.

| 항목 | 내용 |
|---|---|
| 발신 | `모두의수선 <noreply@modo.mom>` (비밀번호 재설정 SMTP와 동일) |
| 수신 | `users.email` 우선, 없으면 `orders.customer_email`. `@noemail.local` / `@example.com` 은 건너뜀 |
| 제목 | `[모두의수선] {템플릿 제목}` |
| 본문 | `notification_templates` (푸시와 동일). `{{order_number}}` 치환. 버튼은 `https://modo.io.kr/orders/{id}` |
| 문구 수정 | 어드민 `/dashboard/notifications/templates` |
| Edge secrets | `RESEND_API_KEY` (발송 전용 키), `RESEND_FROM_EMAIL` |

배송중(`OUT_FOR_DELIVERY`) 템플릿은 Windows CLI 적용 중 한글이 `?`로 저장됐었다. 복구 SQL: `apps/sql/migrations/fix_order_out_for_delivery_template.sql` (2026-08-26 라이브 반영). 한글 INSERT는 hex → UTF-8로 넣을 것.

---

## 운영 모니터 리포트

어드민 **분석 → 운영 리포트** (`/dashboard/reports`). 일자 스냅샷을 저장해 추이를 보고, 칸을 누르면 그날 리포트로 들어간다.

| 항목 | 내용 |
|---|---|
| 아침 메일 | **주말 포함 매일** 설정 시각(기본 KST 09:00)에 전날을 **그때 기준으로 다시 집계**한 뒤 Edge `send-ops-alert`(`type=daily-report`)로 발송. 예전에 저장해 둔 스냅샷을 보내지 않음 |
| 집계 기준 | 맥박(가입·결제·매출)은 어제 KST 0시~24시. 파이프라인·예외는 발송 시각 스냅샷 |
| 시각 설정 | 어드민 운영 리포트 **자동 발송** 칸. on/off + 정각(KST). `ops_report_settings` |
| 크론 | Vercel `0 0 * * *`(매일 UTC 0시 = KST 09:00, 주말 포함) + `0 * * * *`(매시 보정). 설정 시각 이전이면 skip. 그날 이미 보낸 전날 리포트는 다시 안 보냄. 크론이 늦어도 그날 자정까지는 미발송이면 보냄 |
| 즉시 메일 | 결제 `PAID` · 고객 가입 시 Edge `send-ops-alert` |
| 화면 | 맥박/파이프라인/예외 + 가입·탈퇴·활성(30일)·그날 접속·전체 고객. 추이는 기간 + 일·주·월 |
| 날짜 추출 | 그래프·날짜 칸 클릭. 주·월은 해당 구간 일별로 펼친 뒤 하루를 고름. URL `?date=YYYY-MM-DD` |
| 저장 | `ops_daily_reports` (KST 하루, JSON). 과거 백필은 맥박만, 파이프라인은 오늘·어제. 옛 스냅샷은 고객 칸이 비어 0 → **다시 집계** 또는 **이 기간 채우기** |
| 수신 | Edge·Vercel `OPS_REPORT_EMAIL` (쉼표 구분). 화면에서 메일 보내기는 로그인한 관리자 주소도 포함 |
| 발신 | `모두의수선 <noreply@modo.mom>`. Windows CLI로 한글을 넣으면 `????`로 깨지므로 발신명은 UTF-8 MIME(`=?UTF-8?B?...?=`) 또는 코드 기본값 사용 |
| 테스트 | `cd apps/admin && npx tsx lib/ops-daily-report.test.ts` |

고객 지표: 가입은 `users` CUSTOMER(탈퇴 이메일 제외). 탈퇴는 `deleted_%@deleted.modorepair.com` 의 그날 `updated_at`. 활성은 그날 기준 최근 30일 `PAID` 결제 고객(`count_active_customers`). 그날 접속은 `auth.users.last_sign_in_at`(`count_customer_signins`). 웹 탈퇴는 행을 지우지 않고 앱과 같이 익명화한다.

SQL: `create_ops_daily_reports.sql`, `add_ops_alert_triggers.sql` (2026-08-26), `add_ops_customer_report_rpcs.sql` (2026-08-27 라이브 반영), `create_ops_report_settings.sql` (2026-08-28 라이브 반영).

---

## 출고 송장 레이아웃

센터 콘솔 **송장 레이아웃**(`/ops/label-editor`)에서 저장한 우체국 C형 송장(168×107mm) 배치를 `company_info.label_layout_config`에 둔다. 출고송장 인쇄는 이 저장본을 쓴다.

| 화면 | 경로 | 레이아웃 |
|---|---|---|
| 입고 후 출고 송장 | `/ops/inbound` | 저장본 |
| 주문 상세·반송 재출력 | `LabelPrintDialog` | 저장본 |
| 서류 재출력 | `/ops/reprint` | 저장본 |

저장본이 없거나 API 실패면 `ShippingLabelSheet` 기본 양식. 검증: `cd apps/admin && npx tsx lib/shipping-label-print.test.ts`

---

## 센터 입고 · 출고 촬영

입고(`/ops/inbound`)와 출고(`/ops/outbound`)는 같은 촬영 화면이다. 왼쪽은 라이브 녹화, 오른쪽은 수선 항목 스크린샷이다.

| 단계 | 입고 | 출고 |
|---|---|---|
| 송장 스캔 | 입고(수거) 송장 | 출고 송장 |
| 항목 클릭 | 수선 전 사진 | 수선 후 사진 |
| 내품 스캔 | `{송장}-01` | `{송장}-01` |
| 촬영 종료 | 입고송장을 다시 스캔 | 출고송장을 다시 스캔 |
| 저장 영상 | `inbound_video` | `outbound_video` |
| 완료 버튼 | 수선 전 사진 필수 | 수선 후 사진 필수 |

내품을 다 담아도 바로 종료하지 않는다. 송장을 한 번 더 스캔해야 녹화가 올라간다. 관리자 주문 상세·영상 관리에서 수선 전·후 사진과 입고·출고 영상을 본다. 주문 상세 재생은 HLS 플레이어를 쓴다.

검증(Windows에서 `next build`는 하지 않음):

```bash
cd apps/admin
npx tsx lib/barcode.test.ts
npx tsx lib/ops-camera.test.ts
npx tsx lib/admin-media.test.ts
npx tsx lib/order-ops-journey.test.ts
# DB 목업 1건 넣었다가 삭제
npx tsx lib/admin-media.live.test.ts
npx tsx lib/order-ops-journey.live.test.ts
```

### 맥북에서 어드민 빌드 이어가기

이 작업은 Windows에서 로컬 빌드하지 않았다. 맥북에서 `main`을 받은 뒤 타입체크·빌드를 이어서 하면 된다. `main` push면 Vercel 프로젝트 **`modo`**(admin.modo.mom)에 자동 배포된다.

```bash
git checkout main
git pull
cd apps/admin
npm install
npx tsc --noEmit
npm run build
```

---

## 직원 권한

역할은 `users.role` / `staff.role` 기준이다. 로그인·메뉴·URL·직원 CRUD가 같은 규칙을 쓴다. 코드: `apps/admin/lib/staff-permissions.ts`

| 역할 | 로그인 후 | 관리자 대시보드 | 직원 계정 관리 | 센터 콘솔 |
|---|---|---|---|---|
| `SUPER_ADMIN` 최고관리자 | `/dashboard` | 가능 | 모든 역할 부여. 최고관리자 수정 가능, 삭제 불가 | 전체 |
| `ADMIN` 관리자 | `/dashboard` | 가능 | 최고관리자 생성/수정/삭제 불가 | 전체 |
| `MANAGER` 입출고관리자 | `/ops/inbound` | 불가 (로그인으로 퇴출) | 불가 | 입고·출고·반송·재출력·작업내역·레이아웃 |
| `WORKER` 작업자 | `/ops/work` | 불가 | 불가 | 작업·나의 대시보드·작업내역 |

- 직원 관리 UI: `/dashboard/settings/staff`. 목록/생성 API는 `requireAdmin()`, 단건 조회·수정·삭제도 동일. 역할 변경은 `users.role`에 동기화.
- 센터는 메뉴만 숨기지 않는다. 주소로 `/ops/work` 등을 열면 권한 없는 역할은 자기 홈으로 보낸다. 입고 API는 작업자 거부, 작업 API는 입출고관리자 거부.
- 권한 테스트: `cd apps/admin && npx tsx lib/staff-permissions.test.ts`

QA 계정 (비밀번호 `ModoQa#2026Staff!`): `qa.superadmin@modo.mom` · `qa.admin@modo.mom` · `qa.manager@modo.mom` · `qa.worker@modo.mom`

---

## 알려진 이슈 / 수정 이력

| 날짜 | 항목 | 내용 |
|---|---|---|
| 2026-08-31 | 앱 홈 버튼 | 수거신청을 푸터 위 가운데 캡슐로. 상단 로그인 버튼 제거. 스토어 `1.0.6+39` |
| 2026-08-31 | 고객 목록 OS | 어드민 고객 목록·상세에 최근 접속 OS(iOS/Android/웹) 표시. `customer_events.device_os` 기준. 앱 재빌드 없음 |
| 2026-08-31 | 그랜드 오픈 팝업 | 홈 팝업을 그랜드 오픈으로 교체. 웹은 확인 버튼 없음. 앱 버튼은 스토어 빌드 없이 제거 불가라 유지. 웹·앱 공통(`popups`) |
| 2026-08-31 | Play 프로덕션 | `1.0.6 (38)` 대한민국 게시. `/download` Play 링크 연결. iOS `1.0.6`은 심사 중이라 `app_versions`는 아직 유지 |
| 2026-08-31 | Play 사진 권한 | Android 13+ `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` 제거. 갤러리는 시스템 사진 선택 도구. Play `1.0.6+38` |
| 2026-08-31 | 치수 가이드 항목 매칭 | 바지·청바지·치마 기장에 상의 가이드가 나오던 문제. 항목 이름 우선(소매/어깨/품/허리/통/밑위/기장). 정장/수트는 총기장·소매는 상의, 기장 줄임은 하의. 웹 `modo.io.kr` 자동 배포. 앱 `1.0.6+37` |
| 2026-08-31 | 앱 치수 가이드 웹과 동일 | 일상/비교 탭을 웹과 같이 앱에 네이티브로 구현. WebView 잘림 제거. 항목별 일상 안내만 표시. 앱 `1.0.6+37` |
| 2026-08-31 | 센터 입고·출고 촬영 | 입고·출고를 한 화면으로 맞춤. 수선 전/후 사진 후 내품 스캔, 송장 재스캔으로 촬영 종료. 영상은 `inbound_video`/`outbound_video`. 관리자 주문 상세 HLS 재생. Windows 로컬 빌드 없이 맥북에서 이어감 |
| 2026-08-31 | 출고 송장 재출력 레이아웃 | 서류 재출력(`/ops/reprint`)이 저장된 송장 레이아웃을 무시하고 기본 양식으로 찍히던 문제. 입고·주문 상세와 같이 `label_layout_config` 사용. 어드민 `admin.modo.mom` |
| 2026-08-31 | 수선 세부항목 · 전체 가격 | 전체 옵션 없는 항목에서 다음이 안 되던 문제 + 앱에서 치수 화면이 세부부위 뒤에 가려지던 문제. **전체** 선택 시에만 가격 표시. 홈 주문/리뷰 여백. **웹 `modo.io.kr` 라이브(`4eb7e9c`). 앱 `1.0.6+37`** |
| 2026-08-31 | 운영 리포트 크론 SSO | 미들웨어 통과 후에도 `*.vercel.app` 이 Vercel Authentication(SSO) 302. 프로덕션 보호를 Preview만으로 바꿔 크론이 JSON까지 도달. GitHub `ops-report-cron` 이 09:05 KST에 `admin.modo.mom` 으로 재시도 |
| 2026-08-30 | 리뷰 필터 | 전체 리뷰 수선 종류(의류 대분류) 필터. 홈·목록에서 총점·공개 개수 제거. 포토 필터는 데이터 생기면 노출. 앱 `1.0.5+36` |
| 2026-08-30 | 리뷰 DB | 홈 리뷰 목업 제거. 운영 `reviews` 텍스트 4건 적재 후 API로만 표시. 웹 라이브. 앱 `1.0.5+35` |
| 2026-08-30 | 앱 리뷰 · 홈 | 앱에 고객 리뷰 이식. 홈은 웹과 같이 가격표/가이드 → 주문(없으면 「아직 주문 내역이 없어요」) → 리뷰. 배너 200. 앱 가입 복구(간편가입 위). 리뷰 API Bearer. 스토어 `1.0.5+35` |
| 2026-08-30 | 고객 리뷰 | 웹 작성·홈 미리보기·전체/내 리뷰. 어드민 검수·홈 노출 순서·삭제. 로그인 화면 초대 코드 입력 제거(가입에만). 앱은 `1.0.5+35` |
| 2026-08-29 | 전체공지 게시 | 어드민 발송이 Edge Function 직접 호출이라 공지가 `draft`에 남고 앱·웹에 안 보임. `/api/admin/announcements/send`로 게시(`sent`)와 푸시를 분리. `send-announcement-push` 운영 배포. 클릭 시 없던 `/announcements/:id` 상세 추가. 웹 공지는 읽어도 목록 유지. **앱 상세 클릭은 `1.0.4+33`** |
| 2026-08-28 | 결제 전 수치 · 이전 | 결제/수거 화면에 입력 수치 표시. 수치 「이전」은 건너뛴 수선항목 그리드 대신 사진·핀으로. 스토어 `1.0.4+32` |
| 2026-08-28 | 카톡 OG 이미지 | `og.png`(725KB)는 제목만 나오고 그림이 비었다. `og.jpg`(62KB, 2:1)로 교체. 라이브 `https://modo.io.kr/og.jpg`. 이미 보낸 카톡은 캐시라 새 메시지로 확인 |
| 2026-08-28 | 웹 가입·초대 | 초대는 웹 가입 후 앱 설치. 카톡 `og.jpg`. 앱 가입은 웹을 연다. iOS `1.0.4+31` 심사 대기. Play 31은 번들만 업로드, Alpha는 28 |
| 2026-08-28 | 장바구니 담기 | 3단계(수선 항목) 담기 버튼 제거(웹·앱). 4단계(수거 정보)에서만 담기. 앱이 `items[]` 초안을 무시해 기존 장바구니가 있을 때 안 담기던 문제. 포인트 내역 intent UUID 숨김. 앱 `1.0.4+31` |
| 2026-08-28 | 앱 가격안내 순서 | 앱 가격안내가 웹과 달리 직접가격을 묶고 직속 항목을 앞에 둠. 웹 `display_order`와 동일. `1.0.4+31`에 포함 |
| 2026-08-27 | 앱 고객 수치 저장 | 앱 결제 견적이 `repairParts.detail`을 빼서 작업지시서에 고객 수치가 안 나옴. 앱 `1.0.3+29` 스토어 반영. 기존 앱 주문은 복구 불가. 어드민 표시는 웹 배포 |
| 2026-08-27 | 앱 치수 가이드 스크롤 | 수치 입력 화면 「치수 재는 방법」이 잘리고 스크롤이 안 되던 문제. `1.0.2+26` 코드는 27에 포함 |
| 2026-08-29 | 운영 리포트 주말 누락 | 주말 제외가 아니라 발송 창이 20분이라 크론이 늦으면 하루를 건너뜀. 설정 시각 이후 그날 자정까지 미발송이면 보냄. `0 0 * * *` 매일 UTC 0시(KST 09:00) + 매시 보정 |
| 2026-08-27 | 운영 리포트 고객 추이 | 가입·탈퇴·활성(30일)·그날 접속·전체 고객을 하루 숫자·추이·아침에 같이 표시. 아침 메일은 KST 09:00. 어드민 Resend 키 추가, 발신명 `????` 복구. 웹 탈퇴는 익명화 |
| 2026-08-26 | 운영 모니터 리포트 | 일자 스냅샷·추이(기간/일·주·월). 아침 메일, 주문·가입 즉시 메일. 어드민 분석 → 운영 리포트 |
| 2026-08-26 | 포인트 설정 통합 | 가입·초대·주문 적립은 어드민 **포인트 관리 → 포인트 설정**에서만 변경. 설정 화면 카드는 제거. 예전 `/dashboard/settings/points`는 리다이렉트 |
| 2026-08-26 | 직원 권한 | 직원 CRUD에 관리자 인증·역할 승격 제한. 센터는 URL 직접 접근도 역할 홈으로 차단. QA 계정 4개 |
| 2026-08-26 | 배송 시작 알림 문구 | `order_out_for_delivery` 템플릿이 `?? ??`로 깨져 푸시·메일이 깨지던 문제를 복구. 발신 주소는 Auth SMTP와 같은 `모두의수선 <noreply@modo.mom>` |
| 2026-08-25 | 주문 상태 이메일 | 주문 상태 변경 시 FCM 푸시와 함께 Resend 메일을 가입 이메일로 발송. `notification_events` + `trigger_order_status_changed` 를 CLI로 운영 DB에 적용 |
| 2026-08-20 | 앱 업데이트·알림 설정 | `app_versions`로 최신/최소 버전 안내. 로그인 후 알림이 꺼져 있으면 시스템 설정으로 이동. 앱 `1.0.2+25`. iOS `1.0.2` 빌드 25 **Waiting for Review** · Play Alpha AAB 25 업로드. 어드민 설정 → 앱 버전 |
| 2026-08-20 | 어드민 CS 처리 | 주문 상세에서 재작업·수선비 환불·전손·분실 보상. `order_cs_events` 이력. 고객 웹·앱에 회차/배너·푸시 |
| 2026-08-19 | 전손·분실 보상 | 이용약관 제15조·환불정책 제6·7조: `min(잔존가치, 수선비×5, 20만 원)`. 수선 실패는 재작업/수선비 환불. 가치 신고 없음. SQL `20260819_update_damage_compensation.sql` |
| 2026-08-19 | 수선명 오타 | `repair_types.name` 「기잘 줄임」→「기장 줄임」(바지/청바지/치마). 앱 재빌드 불필요 |
| 2026-08-18 | `/download` | 앱 받기 안내. iOS→앱스토어. Android는 2026-08-31 Play 프로덕션 후 스토어 링크 |
| 2026-08-18 | Google 검색 | Search Console 소유확인(HTML 메타 `google-site-verification`) · 사이트맵 제출. 계정 `vovok112@gmail.com` |
| 2026-08-18 | 네이버 검색 | 서치어드바이저 소유확인(HTML 메타) · 사이트맵 `https://modo.io.kr/sitemap.xml` 제출 · 홈(`/`) 수집 요청. 노출은 보통 1~2주, 보장 없음 |
| 2026-08-17 | App Store 출시 | 빌드 **21** (`1.0`) `READY_FOR_SALE`. https://apps.apple.com/kr/app/모두의수선/id6759492888 |
| 2026-08-16 | 스토어 `1.0.1+21` | 가격 안내 탭 가운데 정렬(앱·웹) · 수선 확인 `priceRange` 널 가드. App Store **빌드 21 + 긴 시뮬 녹화** 재제출(2.1). Play Alpha **21 AAB**. |
| 2026-08-16 | 스토어 `1.0.1+21` | 가격 안내 탭 가운데 정렬(앱·웹) · 수선 확인 `priceRange` 널 가드. App Store **빌드 21 + 긴 시뮬 녹화** 재제출(2.1). Play Alpha **21 AAB**. |
| 2026-08-15 | 스토어 `1.0.1+20` | App Store 16 거절(2.1 iPad Apple 1000 · 5.1.1 로그인 벽) 대응. 비회원 홈·가격표 · iPad `ASWebAuthenticationSession` · 권한은 기능 사용 시 · 이메일 계정만 실제 비밀번호 변경. iOS **20 `WAITING_FOR_REVIEW`** · Play Alpha **20 검토 전송**. 웹(`modo.io.kr`)은 원래 비회원 가격 열람이라 변경 없음 |
| 2026-08-13 | Play target API 36 | Play 정책(기한 2026-08-31): `compileSdk`/`targetSdk` **36** 고정 · versionCode **18** AAB · minSdk 24(이전 15는 21)·ABI 3개로 지원 기기 일부 감소 경고는 Alpha·설치 0명 기준 진행 가능 → **`1.0.1+18`** |
| 2026-08-13 | App Store 거절 대응 | 5.1.1(iv) 권한 「허용하기/나중에」→「계속」+항상 시스템 요청 · 2.1 Apple 인앱 OAuth 빈 화면→네이티브 Sign in with Apple · 2.3.10 팝업 Android 문구 제거 → **`1.0.1+16`** |
| 2026-08-13 | OAuth 취소 로딩 | Android에서 Apple/Google/카카오 로그인 창 취소 후 「로그인 중…」 무한 표시. resume 시 세션 없으면 로딩 해제 + 취소 버튼 → **`1.0.1+15`** |
| 2026-08-13 | Android 네이버 로그인 R8 | Play 릴리즈에서 `no_catagorized_error` / `ClassCastException: ParameterizedType`. 원인: AGP R8 full mode가 네이버 SDK(Retrofit) 제네릭을 제거. `proguard-rules.pro`에 Retrofit·`com.navercorp.nid` keep 추가 → **`1.0.1+14`** Play Alpha 배포. 실기기 logcat으로 재현·수정 확인 |
| 2026-08-10 | Play 업로드 키 재설정 | 로컬 `10:90:55…`로 재설정 요청됨. 새 키 유효 시각 **2026-08-12 23:26 KST** (UTC 14:26) 이후 `1.0.1+13` AAB 재업로드 |
| 2026-08-10 | iOS 심사 빌드 13 | IPA `1.0.1 (13)` ASC 업로드 · 기존 심사 취소 · 빌드 **12→13** 연결 · `WAITING_FOR_REVIEW` 재제출 |
| 2026-08-10 | Vercel `web` 좀비 삭제 | 고객 웹 프로덕션은 **`modo-web`만** (`apps/web` · modo.io.kr). CLI 오링크로 생긴 `web` 프로젝트 삭제·로컬을 `modo-web`에 재링크. `web` 재생성 금지 |
| 2026-08-10 | 스토어 `1.0.1+13` | Play Alpha가 옛 `1.0.0 (5)`에 고정 → **versionName 1.0.1**으로 올려 테스터 구분. 포인트내역 메뉴·회원탈퇴→회원정보 · 「 님」공백 · 결제내역 취소 배지. iOS 13·Play AAB 재업로드 |
| 2026-08-10 | 앱 회원가입 SNS | 회원가입 화면 Google·네이버·카카오를 로그인과 동일 `AuthService`로 연결 (기존 Apple만 동작). 스토어 `1.0.0+10` · iOS 빌드 10 심사 재제출 · Play AAB 준비 |
| 2026-08-10 | iOS 심사 빌드 9 | REJECTTED 제출 취소 후 버전 빌드를 **4→9** 연결, 심사 재제출 → `WAITING_FOR_REVIEW` (MinOS 15.0) |
| 2026-08-10 | ITMS-90068 | 빌드 8 업로드 성공했으나 `MinimumOSVersion 13.0` 경고(2027 봄부터 15.0 필수). Podfile·pbxproj·`AppFrameworkInfo.plist`를 **15.0**으로 상향 → 빌드 **9** 재업로드 |
| 2026-08-10 | iOS `1.0.0+8` 업로드 | App Store Connect IPA 업로드 성공 (수동 서명 `ModoRepair AppStore`). Xcode Accounts 미로그인 시 Automatic 대신 Manual 사용 |
| 2026-08-10 | 스토어 `1.0.0+8` | 라이트 테마 · 네이버 · 가격표 배너 제거 · 홈 팝업. iOS/Android +8 준비 후 MinOS 대응으로 **+9**로 이어짐 |
| 2026-08-05 | 알림·공지 닫기 | 읽지 않은 알림·미읽 공지만 목록에 표시. X·「모두 닫기」로 읽음 처리 후 제거(알림=`is_read`, 공지=`announcement_reads`). 웹·앱 동일 |
| 2026-08-04 | 알림·가격표 UX | 웹 알림을 앱처럼 **내 알림 / 공지사항** 탭으로 통합. 알림 본문에서 `ORD…` 주문번호 표시 제거(웹·앱). 소카테고리 그리드 가격 라벨 제거. 의류선택「수선 가격표 확인하기」→`/price-guide` |
| 2026-08-04 | Vercel 강제 재배포 | 모노레포 `vercel deploy` 파일수 제한 → `scripts/force-deploy-web.ps1`로 최신 Production rebuild |
| 2026-08-03 | Xcode Cloud +5 Archive FAILED | `ci_post_clone`·**App Store export 통과**. Dev/Ad Hoc export만 `exit 70`(등록 기기 0대) → 전체 FAILED·TestFlight 자동 업로드 차단. **해결:** [Devices](https://developer.apple.com/account/resources/devices/list)에 iPhone UDID 1대 등록 후 재빌드, 또는 Artifacts의 App Store IPA를 `altool`/Transporter로 수동 업로드 (#41과 동일) |
| 2026-08-03 | Play `1.0.0+5` 교체 | Android edge-to-edge SafeArea·수선부위 그리드 화면 핏. `1.0.0+5` AAB를 Alpha에 업로드해 빌드 4 교체. App Store는 빌드 4 유지(+5 IPA 대기) |
| 2026-08-03 | Xcode Cloud Flutter 3.35.7 | `pubspec.lock`이 `>=3.35.0`인데 CI가 3.32.2라 `pub get` 실패 → 핀 3.35.7. zip/git 설치 스크립트 정리 + `ci_scripts/*.sh` LF 고정 |
| 2026-08-03 | Play 비공개 테스트 제출 | 앱 `4975768727608817713` 생성. 내부 테스트 활성 후 Alpha `1.0.0 (4)`·스토어 등록정보·Data safety 등 게시 개요 제출. 업로드 키 백업 `Documents/modo-android-signing/` |
| 2026-07-25 | Xcode Cloud #41 FAILED | Archive·App Store export·`MinimumOSVersion`은 성공. 등록 기기 0대 → Dev/Ad Hoc export 실패로 액션 FAILED(TestFlight 자동 배포 차단). 빌드 41 IPA는 `altool`로 수동 업로드됨. **기기 UDID 1개 등록**하면 CI 그린 |
| 2026-07-25 | Xcode Cloud Archive FAILED | Naver/Metal 경고는 무관. 실제 원인: (1) `App.framework` `MinimumOSVersion` 누락으로 IPA ASC 검증 실패 (2) 등록 기기 0대로 Development/Ad Hoc export 실패. Automatic 서명·`MinimumOSVersion=13.0`·워크플로 `APP_STORE_ELIGIBLE`로 수정. 심사 빌드 4는 유지 |
| 2026-07-24 | Xcode Cloud Switch 호환 | CI Flutter 3.32.2에 없는 `activeThumbColor` → `activeColor`. App Store 빌드 4는 영향 없음(재제출 불필요) |
| 2026-07-24 | Play 재시도 | AAB `1.0.0+4` 재빌드. Console은 본인 확인이 다시「시작하기」상태라 앱 만들기 잠김 — 신분증/공문서 재업로드 필요 |
| 2026-07-23 | App Store 재제출 (빌드 4) | 치수 UI 반영 후 `1.0.0+4` IPA 업로드·기존 심사 취소·재제출. 상태 `WAITING_FOR_REVIEW` |
| 2026-07-23 | 치수 재는 방법 UX | 웹·Flutter 모두 확인/이전 버튼을 가이드 **위**로 이동. Flutter에 `MeasureGuideAccordion`(웹 가이드 WebView) 추가. `/guide/measure?embed=1` |
| 2026-07-23 | Play Console 계정 | 개인 계정「틸리언」생성·$25 결제. 신원 문서 심사 중(기기 확인 완료). 승인 후 앱 생성·AAB 업로드 |
| 2026-07-23 | App Store 심사용 계정 | `apple-review@modo.io.kr` / `ModoReview2026!` 생성·Connect 등록 |
| 2026-07-23 | 모바일 치수입력 구현 | 핀메모 이후 placeholder였던 직접가격 치수 단계를 웹 `MeasurementStep`과 동일 UI로 구현. 자식 없는 leaf 카테고리의 `requires_measurement`/`input_labels` 누락 수정. 수선유형 1개+치수필요 시 자동 진입 |
| 2026-07-23 | 모바일 KCP 결제창 로딩 멈춤 | WebView가 `about:blank`를 외부 스킴으로 가로채 결제창이 안 열리던 문제 수정. KCP용 `paymentId` 하이픈 제거·`appScheme`·빈 customer 제외를 웹과 맞춤. 라이브 채널 키를 웹과 동기화 |
| 2026-07-23 | iOS 수출규정 키 | `Info.plist`에 `ITSAppUsesNonExemptEncryption=false` 추가 (App Store Connect Missing Compliance 질문 생략) |
| 2026-07-21 | 초대 양측 적립 | 초대 코드 적용 시 초대자·피초대자 모두 포인트 지급(각 기본 1000P, 어드민 개별 설정) |
| 2026-07-21 | 회원가입 적립 | 신규 가입 시 축하 포인트(기본 **1,000P**, 어드민 설정). 웹·앱·OAuth 공통 DB 트리거 지급. 기존 회원 소급 없음 |
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
# (채널 키는 웹 라이브 NHN KCP 단건결제 채널과 동일해야 함)

flutter pub get
cd ios && pod install && cd ..
flutter run
```

> Android 에뮬레이터: Android Studio AVD 또는 `flutter emulators --launch <id>`
> WebView 결제창은 Android / iOS 기기(에뮬레이터 포함)에서만 동작합니다 (Windows/Web 대상 빌드 제외).
> 시뮬레이터에서는 카드사 앱(ISP 등) 연동이 제한될 수 있어, 출시 전 실기기 결제 1회를 권장합니다.

### Edge Functions

```bash
cd apps/edge

# 로컬 환경변수 설정
supabase secrets set PORTONE_API_SECRET=xxx

# 함수 배포
supabase functions deploy payments-confirm --no-verify-jwt
supabase functions deploy payments-cancel --no-verify-jwt
supabase functions deploy send-push-notification
supabase functions deploy process-pending-notifications
supabase functions deploy send-announcement-push

# DB — 특정 SQL만 원격에 적용 (전체 db push 금지: 히스토리 미스매치)
supabase db query --linked --file supabase/migrations/20260825000000_send_order_status_email_on_change.sql
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

# Resend (주문 상태·운영 리포트. Edge secrets + Vercel modo)
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=모두의수선 <noreply@modo.mom>
OPS_REPORT_EMAIL=support_modo@tillion.kr
```

---

## 배포

`main` 브랜치에 push하면 Vercel(GitHub 연동)에서 자동 배포됩니다.

| Vercel 프로젝트 | Root Directory | 도메인 | 앱 |
|---|---|---|---|
| **`modo-web`** | `apps/web` | modo.io.kr · modo.mom · modorepair.com | 고객 웹 (유일한 프로덕션) |
| **`modo`** | `apps/admin` | admin.modo.mom | 어드민 |

### 주의: `web` 프로젝트 만들지 말 것

팀 계정에 **`web`이라는 이름의 Vercel 프로젝트가 생기면 잘못된 배포**다. (2026-08-10 정리)

- 실제 고객 웹은 **`modo-web`만** 사용한다. `modo.io.kr` / `modo.mom` 도메인도 `modo-web`에만 붙어 있다.
- `apps/web`에서 `vercel --prod`를 칠 때 로컬 `.vercel`이 `web`에 링크되어 있으면, 예전에 지운 `web`이 **다시 생성**되고 env·Root Directory가 비어 빌드가 실패한다.
- `web`이 보이면 **삭제**하고, 로컬은 아래로 `modo-web`에만 링크한다.

```bash
cd apps/web
rm -rf .vercel
vercel link --yes --project modo-web --scope springs-projects-072b5dfd
# .vercel 은 gitignore — 커밋하지 않음
vercel --prod   # 이후 CLI 배포도 modo-web 으로 감
```

강제 재배포·캐시 이슈 시에도 **`modo-web` / `modo`만** 대상으로 한다. 모노레포 루트를 새 프로젝트로 import하지 않는다.

### 강제 재배포 (캐시/반영 지연 시)

모노레포를 `vercel deploy`로 올리면 파일 수 제한에 걸리므로, **최신 Production 배포를 rebuild**하는 방식을 씁니다.

```powershell
# 고객 웹 (modo.io.kr) → 프로젝트 modo-web
powershell -ExecutionPolicy Bypass -File scripts/force-deploy-web.ps1

# 어드민 (admin.modo.mom) → 프로젝트 modo
powershell -ExecutionPolicy Bypass -File scripts/force-deploy-web.ps1 -Project admin
```

또는 CLI 직접:

```bash
vercel ls modo-web --prod
vercel redeploy <최신-production-deployment-url> --target production
```
---

## DB 마이그레이션

```bash
cd apps/edge
supabase db push
```

부분 적용(권장): `supabase db query --linked --file apps/sql/migrations/<file>.sql`

마이그레이션 파일 위치: `apps/edge/supabase/migrations/` · `apps/sql/migrations/`

Windows CLI로 한글 SQL을 넣으면 `?`로 깨질 수 있다. 운영 문구 복구는 hex → UTF-8 (`fix_order_out_for_delivery_template.sql`)을 쓴다.
