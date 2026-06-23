# 🧵 모두의수선 (MODU'S REPAIR)

> 비대면 의류 수선 플랫폼 — 고객 웹 · 관리자 콘솔 · Flutter 앱 · Edge Functions

---

## 📖 프로젝트 소개

**모두의수선**은 고객이 집에서 의류 수선을 신청하고, 택배 수거 → 전문 수선 → 배송 완료까지 비대면으로 처리하는 서비스입니다.

- 고객은 **웹([modo.io.kr](https://modo.io.kr))** 또는 **Flutter 앱**으로 수선을 접수합니다.
- 관리자·운영자는 **admin.modorepair.com** (또는 admin.modo.mom)에서 주문·배송·정산·콘텐츠를 관리합니다.
- 결제는 **토스페이먼츠(Toss Payments)** 위젯으로 처리하며, 물류는 **우체국 택배 API**와 연동됩니다.
- 입고·출고 영상은 **Cloudflare Stream**에 업로드되어 고객에게 투명하게 공유됩니다.

---

## 🗂 프로젝트 구조

```
modo/
├── apps/
│   ├── web/             # Next.js 14 고객 웹앱 (modo.io.kr)
│   ├── admin/           # Next.js 14 관리자·운영 콘솔 (admin.modorepair.com)
│   ├── mobile/          # Flutter 고객용 앱 (iOS / Android)
│   ├── edge/            # Supabase Edge Functions (Deno)
│   └── sql/             # Postgres DDL 및 마이그레이션
├── supabase/migrations/ # 루트 Supabase 마이그레이션
├── docs/                # 아키텍처, API, DB 문서
└── README.md
```

---

## 🔗 서비스 URL

| 서비스 | URL | Vercel 프로젝트 | 설명 |
|--------|-----|----------------|------|
| **고객 웹 (메인)** | [modo.io.kr](https://modo.io.kr) | modo-web | Next.js 고객 포털 (`apps/web`) |
| 고객 웹 (레거시) | [modorepair.com](https://modorepair.com), [modo.mom](https://modo.mom) | modo-web | 기존 도메인 — 전환 기간 유지 |
| **관리자** | [admin.modorepair.com](https://admin.modorepair.com) | modo | 관리자·운영 콘솔 (`apps/admin`) |
| 관리자 (레거시) | [admin.modo.mom](https://admin.modo.mom) | modo | 기존 admin 도메인 |

> 고객 웹 DNS: 카페24 `modo.io.kr` → Vercel `modo-web` (A `76.76.21.21`, www CNAME `cname.vercel-dns.com`)

---

## 🧩 기술 스택

### 고객 웹 (`apps/web`)
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS, Lucide Icons
- **상태관리**: TanStack Query (React Query)
- **인증**: Supabase SSR (`@supabase/ssr`)
- **결제**: Toss Payments SDK (`@tosspayments/tosspayments-sdk`)
- **배포**: Vercel (포트 3001)

### 관리자 (`apps/admin`)
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS, Radix/shadcn-ui, Recharts
- **업로드**: tus-js-client (Cloudflare Stream 청크 업로드)
- **비디오**: hls.js (HLS 재생)
- **배포**: Vercel

### 공통 백엔드
- **Database & Auth**: Supabase (Postgres + RLS + Auth)
- **Edge Functions**: Deno (결제 확인, 알림, 물류 등)
- **Video CDN**: Cloudflare Stream
- **Logistics**: 우체국 API
- **Push Notification**: Firebase Cloud Messaging (FCM)
- **이메일 발송**: Resend (`noreply@modo.mom`) — 비밀번호 재설정 등 트랜잭션 메일

---

## ✅ 구현 현황

> **최종 업데이트:** 2026-06-23 — 소셜로그인 콜백 URL 수정 (네이버 `disp_stat=207` 해결), Resend SMTP 비밀번호 재설정 설정 완료, Supabase Site URL `modo.io.kr` 확정

### `apps/web` (고객 웹)

| 기능 | 상태 | 설명 |
|------|------|------|
| 이메일 회원가입 / 로그인 | ✅ 완료 | Supabase Auth, 콜백 라우트 |
| 소셜 로그인 | ✅ 완료 | 카카오·구글·네이버 (콜백 URL 고정), 애플 미설정 |
| 비밀번호 찾기 / 재설정 | ✅ 완료 | Resend SMTP (`noreply@modo.mom`) → `modo.io.kr/auth/reset-password` |
| 홈 화면 | ✅ 완료 | 배너 슬라이더, 최근 주문, 추가결제 알림 |
| 수선 접수 (4단계 마법사) | ✅ 완료 | 의류선택 → 수선항목 → 사진+핀 → 수거정보 |
| 장바구니 | ✅ 완료 | `/cart` — 주문 draft 저장, 이어서 수거신청 |
| 결제 (`payment_intents`) | ✅ 완료 | intent 생성 → `/payment` → Toss 결제창 → Edge 승인 |
| 결제 페이지 사업자·약관 | ✅ 완료 | 푸터 표시 (PG 심사 대응) |
| 추가 결제 | ✅ 완료 | `/orders/[id]/extra-charge` |
| 주문 목록 | ✅ 완료 | 상태 탭 필터 (전체/진행중/완료/취소) |
| 주문 상세 | ✅ 완료 | 6단계 타임라인, 입출고 영상, 배송 추적 |
| 주문 취소 / 반송 | ✅ 완료 | 수거 전 전액 환불 · 입고 후 배송비 차감 부분 환불 |
| 배송 추적 | ✅ 완료 | 우체국 송장번호 연동 |
| 알림 | ✅ 완료 | 읽음 처리 포함 |
| 공지사항 | ✅ 완료 | 아코디언 펼치기 |
| 이용약관 / 개인정보 / 환불정책 | ✅ 완료 | `/terms`, `/privacy-policy`, `/refund-policy` (DB `app_contents`) |
| 사업자 정보 푸터 | ✅ 완료 | `company_info` — anon 읽기 허용 (PG 심사) |
| 마이페이지 | ✅ 완료 | 프로필, 포인트 표시 |
| 회원정보 수정 | ✅ 완료 | `/profile/account` |
| 배송지 관리 | ✅ 완료 | `/profile/addresses` |
| 결제 내역 | ✅ 완료 | `/profile/payment-history` |
| 포인트 내역 | ✅ 완료 | `/profile/points` |
| 친구 초대 | ✅ 완료 | 초대 코드, `getSiteUrl()` 공유 링크 |
| 고객센터 | ✅ 완료 | 카카오 채널, 이메일, FAQ |
| 설정 | ✅ 완료 | 알림 토글, 약관, 탈퇴 |
| 가격표 | ✅ 완료 | `/guide/price` (수선 종류별 가격) |
| 쉬운 가이드 | ✅ 완료 | `/guide/easy` (4단계 이용 안내, 치수 재는 방법 링크 포함) |
| 치수 재는 방법 가이드 | ✅ 완료 | `/guide/measure` (일상적인 방법 / 잘 맞는 옷과 비교 탭, 수선 유형별 일러스트) |
| 수선 접수 - 치수 입력 | ✅ 완료 | 카테고리별 안내 문구(bullet), 치수 재는 방법 모달, 버튼 화면 하단 고정 |
| 앱 다운로드 유도 | ✅ 완료 | iOS / Android 스토어 링크 |
| 미들웨어 (세션 보호) | ✅ 완료 | 비로그인 시 `/login` 리다이렉트 |

### 토스페이먼츠 · PG 심사 준비

| 항목 | 상태 | 설명 |
|------|------|------|
| 메인 도메인 | ✅ | `https://modo.io.kr` (Vercel `modo-web`) |
| 약관·개인정보·환불정책 DB | ✅ | PG 심사 대응 전면 개정 (토스페이먼츠 위탁 명시) |
| 결제 승인 / 취소 / 환불 | ✅ | Edge `payments-confirm-toss`, `payments-cancel` + admin API |
| 웹훅 | ✅ | `admin` `/api/pay/webhook` |
| 토스 전자결제 신청 | ⏳ 대기 | 라이브 키·실결제 테스트 후 신청 예정 |

### `apps/mobile` (Flutter 앱)

| 기능 | 상태 | 설명 |
|------|------|------|
| 수선 접수 · 주문 관리 | ✅ 완료 | 웹과 동일 플로우 |
| Toss 결제 위젯 | ✅ 완료 | 약관 동의 위젯 포함 |
| 비밀번호 재설정 redirect | ✅ 완료 | `modo.io.kr/auth/reset-password` |
| 푸터 사업자 정보 | ✅ 완료 | `CompanyFooter` + `company_info` |

### 주문 상태 타임라인

| 상태 | 레이블 | 설명 |
|------|--------|------|
| `PENDING_PAYMENT` | 결제대기 | ⚠️ 레거시 — 신규 흐름은 `payment_intents` 사용 |
| `BOOKED` | 수거예약 | 결제 완료, 수거 예약됨 |
| `PICKED_UP` | 수거완료 | 택배 기사 수거 완료 |
| `INBOUND` | 입고완료 | 수선센터 입고 |
| `PROCESSING` | 수선중 | 수선 진행 |
| `READY_TO_SHIP` | 출고완료 | 수선 완료, 출고됨 |
| `DELIVERED` | 배송완료 | 고객 수령 |
| `CANCELLED` | 수거취소 | 취소 처리 |

### `apps/admin` (관리자·운영 콘솔)

| 영역 | 상태 | 주요 기능 |
|------|------|-----------|
| 주문 관리 | ✅ 완료 | 목록/상세/상태변경/취소/추가결제/반품 |
| 배송·물류 | ✅ 완료 | 수거예약, 송장발급, 배송 추적 |
| 결제 관리 | ✅ 완료 | Toss 결제 확인/취소/웹훅 |
| 고객 관리 | ✅ 완료 | 고객 목록/상세, 포인트 조정 |
| 포인트 시스템 | ✅ 완료 | 설정/통계/트랜잭션/만료 |
| 영상 관리 | ✅ 완료 | Cloudflare Stream, HLS 재생 |
| 분석/통계 | ✅ 완료 | KPI, 고객 행동, 감사 로그 |
| 콘텐츠 관리 | ✅ 완료 | 배너, 공지사항, 앱 컨텐츠 |
| 수선 메뉴 | ✅ 완료 | 수선 종류/카테고리/가격, 카테고리별 안내 문구(멀티라인 textarea) |
| 프로모션 | ✅ 완료 | 프로모션 CRUD |
| 직원 관리 | ✅ 완료 | 역할 기반 계정 (ADMIN/MANAGER/WORKER) |
| OPS 콘솔 | ✅ 완료 | 입고/작업/출고, 디바이스, 라벨에디터 |

---

## ⚙️ 핵심 아키텍처

### 데이터 흐름

```
[고객 웹/앱] → 수선 접수 → payment_intent 생성 (payload + 금액)
                   ↓
           토스페이먼츠 결제 (웹: 결제창 / 앱·admin: 위젯)
                   ↓
        Edge Function: payments-confirm-toss
                   ↓
          orders insert + status = BOOKED (수거 예약됨)
                   ↓
      [관리자] 수거예약 + 우체국 송장 발행
                   ↓
         택배 기사 수거 → PICKED_UP
                   ↓
       수선센터 입고 영상 촬영 → INBOUND
                   ↓
         수선 진행 → PROCESSING
                   ↓
       출고 영상 촬영 → READY_TO_SHIP
                   ↓
         고객 배송 완료 → DELIVERED
```

### 인증·권한

- **고객**: Supabase Auth (email/OAuth), RLS로 본인 데이터만 접근
- **관리자 DASHBOARD**: `users.role = ADMIN` 필수
- **운영 OPS**: `SUPER_ADMIN / ADMIN / MANAGER / WORKER` 허용
- **도메인 분리**: admin 미들웨어에서 허용 admin 도메인만 서비스 (`admin.modorepair.com`, `admin.modo.mom`)

---

## 🚀 로컬 실행

### 사전 요구사항

- Node.js 18+
- Flutter 3.16+ (모바일 앱)
- Deno 1.40+ (Edge Functions)
- Supabase CLI

### 고객 웹 (`apps/web`)

```bash
cd apps/web
cp .env.local.example .env.local
# .env.local에 Supabase URL/KEY, Toss 클라이언트 키 입력
npm install
npm run dev   # http://localhost:3001
```

### 관리자 (`apps/admin`)

```bash
cd apps/admin
# ADMIN_ENV_SETUP.md 참조하여 .env.local 설정
npm install
npm run dev   # http://localhost:3000
```

### Edge Functions

```bash
cd apps/edge
supabase functions serve
```

### Flutter 앱

```bash
cd apps/mobile
flutter pub get
flutter run
```

---

## 🔑 환경변수 (웹)

`.env.local.example` 참조:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 |
| `NEXT_PUBLIC_APP_URL` | 서비스 URL (e.g. https://modo.io.kr) |
| `NEXT_PUBLIC_IOS_APP_URL` | App Store 링크 |
| `NEXT_PUBLIC_ANDROID_APP_URL` | Play Store 링크 |
| `NEXT_PUBLIC_APP_DEEP_LINK` | 앱 딥링크 스킴 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (서버사이드 전용) |
| `NAVER_CLIENT_ID` | 네이버 OAuth 앱 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth 앱 Client Secret |

---

## 📚 문서

- [아키텍처 설계](docs/architecture.md)
- [API 명세](docs/api-spec.md)
- [데이터베이스 스키마](docs/database-schema.md)
- [배포 가이드](docs/deployment.md)
- [관리자 환경 설정](apps/admin/ADMIN_ENV_SETUP.md)
- [토스페이먼츠 연동 가이드](apps/admin/TOSS_PAYMENT_SETUP.md)

---

## 🧭 개발 규칙

- **커밋 메시지**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **보안**: 모든 시크릿은 `.env.local`에만 보관, Git에 커밋 금지
- **DB 접근**: 관리자 서버 라우트는 `SUPABASE_SERVICE_ROLE_KEY` 사용, 고객 웹은 RLS 의존
- **모바일 우선**: 고객 웹은 최대 430px 컨테이너로 모바일 앱 UX를 재현

---

## 📄 라이선스

Private — 무단 복제 및 배포 금지

---

**Built with ❤️ for better repair service**
