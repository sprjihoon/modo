# 🧵 모두의수선 (MODU'S REPAIR)

> 비대면 의류 수선 플랫폼 — 고객 웹 · 관리자 콘솔 · Flutter 앱 · Edge Functions

---

## 📖 프로젝트 소개

**모두의수선**은 고객이 집에서 의류 수선을 신청하고, 택배 수거 → 전문 수선 → 배송 완료까지 비대면으로 처리하는 서비스입니다.

- 고객은 **웹(modo.mom)** 또는 **Flutter 앱**으로 수선을 접수합니다.
- 관리자·운영자는 **admin.modo.mom**에서 주문·배송·정산·콘텐츠를 관리합니다.
- 결제는 **토스페이먼츠(Toss Payments)** 위젯으로 처리하며, 물류는 **우체국 택배 API**와 연동됩니다.
- 입고·출고 영상은 **Cloudflare Stream**에 업로드되어 고객에게 투명하게 공유됩니다.

---

## 🗂 프로젝트 구조

```
modo/
├── apps/
│   ├── web/             # Next.js 14 고객 웹앱 (modo.mom)
│   ├── admin/           # Next.js 14 관리자·운영 콘솔 (admin.modo.mom)
│   ├── mobile/          # Flutter 고객용 앱 (iOS / Android)
│   ├── edge/            # Supabase Edge Functions (Deno)
│   └── sql/             # Postgres DDL 및 마이그레이션
├── supabase/migrations/ # 루트 Supabase 마이그레이션
├── docs/                # 아키텍처, API, DB 문서
└── README.md
```

---

## 🔗 서비스 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| **고객 웹** | [modo.mom](https://modo.mom) | Next.js 고객 포털 |
| **관리자** | [admin.modo.mom](https://admin.modo.mom) | 관리자·운영 콘솔 |

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

---

## ✅ 구현 현황

### `apps/web` (고객 웹)

| 기능 | 상태 | 설명 |
|------|------|------|
| 이메일 회원가입 / 로그인 | ✅ 완료 | Supabase Auth, 콜백 라우트 |
| 비밀번호 찾기 / 재설정 | ✅ 완료 | 이메일 링크 기반 |
| 홈 화면 | ✅ 완료 | 배너 슬라이더, 최근 주문, 추가결제 알림 |
| 수선 접수 (4단계 마법사) | ✅ 완료 | 의류선택 → 수선항목 → 사진+핀 → 수거정보 |
| 결제 (토스페이먼츠) | ✅ 완료 | 위젯 결제, 승인(Edge Function) |
| 추가 결제 | ✅ 완료 | `/orders/[id]/extra-charge` |
| 주문 목록 | ✅ 완료 | 상태 탭 필터 (전체/진행중/완료/취소) |
| 주문 상세 | ✅ 완료 | 6단계 타임라인, 입출고 영상, 배송 추적 |
| 배송 추적 | ✅ 완료 | 우체국 송장번호 연동 |
| 알림 | ✅ 완료 | 읽음 처리 포함 |
| 공지사항 | ✅ 완료 | 아코디언 펼치기 |
| 마이페이지 | ✅ 완료 | 프로필, 포인트 표시 |
| 회원정보 수정 | ✅ 완료 | `/profile/account` |
| 배송지 관리 | ✅ 완료 | `/profile/addresses` |
| 결제 내역 | ✅ 완료 | `/profile/payment-history` |
| 포인트 내역 | ✅ 완료 | `/profile/points` |
| 친구 초대 | ✅ 완료 | 초대 코드, 공유 기능 |
| 고객센터 | ✅ 완료 | 카카오 채널, 이메일, FAQ |
| 설정 | ✅ 완료 | 알림 토글, 약관, 탈퇴 |
| 가격표 | ✅ 완료 | `/guide/price` (수선 종류별 가격) |
| 쉬운 가이드 | ✅ 완료 | `/guide/easy` (4단계 이용 안내) |
| 앱 다운로드 유도 | ✅ 완료 | iOS / Android 스토어 링크 |
| 미들웨어 (세션 보호) | ✅ 완료 | 비로그인 시 `/login` 리다이렉트 |

### 주문 상태 타임라인 (6단계)

| 상태 | 레이블 | 설명 |
|------|--------|------|
| `PENDING_PAYMENT` | 결제대기 | 결제 전 상태 |
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
| 수선 메뉴 | ✅ 완료 | 수선 종류/카테고리/가격 |
| 프로모션 | ✅ 완료 | 프로모션 CRUD |
| 직원 관리 | ✅ 완료 | 역할 기반 계정 (ADMIN/MANAGER/WORKER) |
| OPS 콘솔 | ✅ 완료 | 입고/작업/출고, 디바이스, 라벨에디터 |

---

## ⚙️ 핵심 아키텍처

### 데이터 흐름

```
[고객 웹/앱] → 수선 접수 → Supabase DB (orders)
                   ↓
           토스페이먼츠 결제 위젯
                   ↓
        Edge Function: payments-confirm-toss
                   ↓
          status = BOOKED (수거 예약됨)
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
- **도메인 분리**: admin 미들웨어에서 `admin.modo.mom` 이외 요청은 `modo.mom`으로 리다이렉트

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
| `NEXT_PUBLIC_APP_URL` | 서비스 URL (e.g. https://modo.mom) |
| `NEXT_PUBLIC_IOS_APP_URL` | App Store 링크 |
| `NEXT_PUBLIC_ANDROID_APP_URL` | Play Store 링크 |
| `NEXT_PUBLIC_APP_DEEP_LINK` | 앱 딥링크 스킴 |

---

## 📚 문서

- [아키텍처 설계](docs/architecture.md)
- [API 명세](docs/api-spec.md)
- [데이터베이스 스키마](docs/database-schema.md)
- [배포 가이드](docs/deployment.md)
- [관리자 환경 설정](apps/admin/ADMIN_ENV_SETUP.md)

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
