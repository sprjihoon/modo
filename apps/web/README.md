# 모두의수선 - 고객 웹 서비스 (`apps/web`)

> **도메인:** [https://modo.mom](https://modo.mom)  
> **기술 스택:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase

---

## 현재 구현 상태

### ✅ 완료된 기능

#### 인증 (Auth)
| 기능 | 상태 | 비고 |
|------|------|------|
| 이메일/비밀번호 로그인 | ✅ | - |
| 카카오 로그인 | ✅ | Supabase OAuth |
| 구글 로그인 | ✅ | Supabase OAuth |
| 네이버 로그인 | ✅ | Naver OAuth 2.0 → Edge Function `naver-auth` |
| 애플 로그인 | ✅ | Supabase OAuth (Apple Dev 계정 필요) |
| 회원가입 | ✅ | 이메일/비밀번호 |
| 비밀번호 찾기 | ✅ | Supabase 이메일 발송 |

#### 주문 플로우 (Order Flow)
| 기능 | 상태 | 비고 |
|------|------|------|
| 의류 종류 선택 | ✅ | admin DB의 `repair_categories`에서 동적 로드, SVG 아이콘 |
| 수선 항목 선택 | ✅ | `repair_types` 테이블 연동 |
| 사진 업로드 + 핀 메모 | ✅ | Supabase Storage `order-images` 버킷 |
| 수거일 선택 | ✅ | 달력 UI |
| 배송지 입력 | ✅ | 주소록에서 불러오기 + 직접입력 |
| 결제 (TossPayments) | ✅ | TossPayments v2 위젯, Edge Function 검증 |

#### 주문 관리
| 기능 | 상태 | 비고 |
|------|------|------|
| 전체 주문 내역 조회 | ✅ | 3단계 fallback 조회 (user_id → auth.uid → RLS) |
| 주문 상세 보기 | ✅ | 타임라인 진행 상태 |
| 우체국 배송 추적 | ✅ | `shipments-track` Edge Function 연동 |
| 송장번호 표시 | ✅ | `shipments` 또는 `orders.tracking_no` |
| 입고/출고 영상 | ✅ | Cloudflare Stream 임베드 |
| 추가 결제 (extra charge) | ✅ | PENDING_CUSTOMER 상태 배너 |
| 주문 취소 | ✅ | BOOKED 또는 PENDING_PAYMENT 상태에서 가능 |

#### 프로필
| 기능 | 상태 | 비고 |
|------|------|------|
| 내 정보 보기/수정 | ✅ | 이름, 전화번호 |
| 배송지 관리 | ✅ | 추가/삭제/기본 설정 |
| 결제 내역 | ✅ | 결제완료 주문 목록 |
| 포인트 내역 | ✅ | `point_transactions` 테이블 |
| 공지사항 | ✅ | `announcements` 테이블 |
| 쿠폰 | ⚠️ | 기본 UI만 (쿠폰 적용 로직 미구현) |
| 리뷰 쓰기 | ❌ | 미구현 |
| 친구 초대 | ❌ | 미구현 |

#### UI/UX
| 기능 | 상태 | 비고 |
|------|------|------|
| 모바일-퍼스트 레이아웃 | ✅ | max-width 430px 중앙 배치 |
| 앱 다운로드 배너 | ✅ | 상단 고정 |
| 하단 탭바 | ✅ | 홈/주문/프로필 |
| 헤더 브랜드명 | ✅ | `company_info.header_title` 동적 로드 |
| 배너 슬라이더 | ✅ | `banners` 테이블 |
| SVG 의류 아이콘 | ✅ | 모바일 앱과 동일한 아이콘 |
| 다크모드 | ❌ | 미구현 |

---

### ⚠️ 주의 사항

#### 알려진 이슈
1. **Apple 로그인**: Supabase 대시보드에 Apple OAuth 공급자 설정이 필요합니다.
2. **네이버 로그인**: Naver `naver-auth` Edge Function이 Supabase에 배포되어 있어야 합니다. 로컬 `.env.local`에는 `NAVER_CLIENT_ID=b7QJILomSlfsFL7RuAQs`가 설정됩니다.
3. **쿠폰**: UI만 있고, 실제 쿠폰 적용 및 할인 로직은 미구현입니다.

#### DB 스키마 주의
- `orders` 테이블에는 `pickup_date` 컬럼이 없습니다 (쿼리 시 제외해야 함).
- `shipments` 테이블에는 `direction` 컬럼이 없습니다 (쿼리 시 제외해야 함).
- `orders.payment_status` ENUM: `PENDING | PAID | FAILED | REFUNDED`
- `orders.status` ENUM: `PENDING | BOOKED | PICKED_UP | INBOUND | PROCESSING | READY_TO_SHIP | DELIVERED | CANCELLED`

---

## 아키텍처

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (protected)/             # 로그인 필요 페이지
│   ├── api/                     # API Routes (서버사이드)
│   │   ├── auth/naver/          # 네이버 OAuth 토큰 교환
│   │   ├── orders/              # 주문 생성/수정
│   │   └── payment/             # TossPayments 검증
│   ├── auth/                    # Auth 콜백 페이지
│   │   ├── callback/            # Supabase OAuth 콜백
│   │   └── naver/callback/      # 네이버 OAuth 콜백
│   ├── orders/[id]/tracking/    # 배송 추적 페이지
│   ├── payment/                 # 결제 페이지
│   └── profile/                 # 프로필 하위 페이지
├── components/
│   ├── auth/                    # 로그인/회원가입
│   ├── home/                    # 홈 화면
│   ├── layout/                  # 공통 레이아웃
│   ├── order/                   # 주문 생성 플로우
│   ├── orders/                  # 주문 목록/상세
│   └── profile/                 # 프로필 관련
├── lib/
│   ├── supabase/                # Supabase 클라이언트 (client/server)
│   └── utils.ts                 # 공통 유틸리티
└── public/
    └── icons/                   # SVG 의류 아이콘 (모바일 앱과 동일)
```

---

## 환경 변수

`.env.local` (로컬 개발):
```env
NEXT_PUBLIC_SUPABASE_URL=https://rzrwediccbamxluegnex.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_docs_...
NEXT_PUBLIC_NAVER_CLIENT_ID=b7QJILomSlfsFL7RuAQs
NAVER_CLIENT_ID=b7QJILomSlfsFL7RuAQs
NAVER_CLIENT_SECRET=M_cxR3WuTs
```

Vercel 프로덕션 환경 변수 (별도 설정 필요):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=https://modo.mom`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` (운영키)
- `NEXT_PUBLIC_NAVER_CLIENT_ID`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

---

## 배포

**프로덕션 배포:**
```bash
cd apps/web
vercel deploy --prod --yes --archive=tgz
```

**도메인 설정:**
- `modo.mom` → `apps/web` (고객 웹 서비스)
- `admin.modo.mom` → `apps/admin` (관리자 페이지)

---

## 모바일 앱 대비 미구현 기능

| 기능 | 모바일 앱 | 웹 |
|------|----------|-----|
| 리뷰 작성 | ✅ | ❌ |
| 쿠폰 사용 | ✅ | ⚠️ UI만 |
| 친구 초대 | ✅ | ❌ |
| 알림 (Push) | ✅ | ❌ (웹은 불가) |
| 앱 내 공지사항 팝업 | ✅ | ❌ |
| 프로필 이미지 변경 | ✅ | ❌ |
| 애플 로그인 | ✅ | ✅ (설정 필요) |
| 네이버 로그인 | ✅ | ✅ |
| 카카오 로그인 | ✅ | ✅ |
| 구글 로그인 | ✅ | ✅ |
