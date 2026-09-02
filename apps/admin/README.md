# 모두의수선 - Admin Console (Next.js)

모두의수선 관리자 및 운영자용 웹 콘솔

## 🎯 주요 기능

### 대시보드
- [x] 운영 현황 통계
- [x] 최근 주문 목록
- [ ] 실시간 차트

### 주문 관리
- [x] 주문 목록 조회
- [x] 주문 상세 보기
- [x] 5단계 타임라인 UI
- [ ] 주문 상태 변경
- [ ] 송장 출력

### 영상 관리
- [x] 영상 업로드 UI
- [x] Cloudflare Stream 연동 (입고 `inbound_video` · 출고 `outbound_video`)
- [x] 주문 상세·영상 관리 미리보기 (HLS)

### 센터 입고 · 출고
- [x] `/ops/inbound` 수선 전 사진 + 입고영상
- [x] `/ops/outbound` 수선 후 사진 + 출고영상
- [x] 내품 바코드 스캔 후 송장 재스캔으로 촬영 종료
- [x] 사진 없이 입고/출고완료 차단

### 고객 관리
- [ ] 고객 목록
- [ ] 고객 상세 정보
- [ ] 주문 이력

### 설정
- [ ] 사용자 관리
- [ ] 시스템 설정
- [ ] API 키 관리

## 🚀 시작하기

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# 또는
yarn install
```

### 환경 설정

1. `.env.local` 파일 생성
```bash
cp ../../env.example .env.local
```

2. `.env.local` 파일 편집
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📂 프로젝트 구조

```
apps/admin/
├── app/                      # Next.js App Router
│   ├── dashboard/            # 대시보드 페이지
│   │   ├── orders/           # 주문 관리
│   │   ├── customers/        # 고객 관리
│   │   ├── videos/           # 영상 관리
│   │   └── settings/         # 설정
│   ├── login/                # 로그인 페이지
│   ├── layout.tsx            # 루트 레이아웃
│   ├── providers.tsx         # React Query 프로바이더
│   └── globals.css           # 전역 스타일
├── components/               # 컴포넌트
│   ├── dashboard/            # 대시보드 컴포넌트
│   ├── orders/               # 주문 관련 컴포넌트
│   └── ui/                   # Shadcn UI 컴포넌트
├── lib/                      # 유틸리티
│   ├── utils.ts              # 공통 유틸
│   └── supabase.ts           # Supabase 클라이언트
├── public/                   # 정적 파일
├── package.json              # 의존성
├── tsconfig.json             # TypeScript 설정
├── tailwind.config.ts        # Tailwind 설정
└── next.config.js            # Next.js 설정
```

## 🧩 기술 스택

### 프레임워크
- **Next.js 14** - React 프레임워크 (App Router)
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 CSS

### UI 라이브러리
- **Shadcn/UI** - 컴포넌트 라이브러리
- **Lucide React** - 아이콘
- **Radix UI** - 헤드리스 UI 컴포넌트

### 상태 관리 & 데이터
- **React Query** - 서버 상태 관리
- **Supabase JS** - 백엔드 클라이언트

### 폼 관리
- **React Hook Form** - 폼 관리
- **Zod** - 스키마 검증

## 🎨 디자인 시스템

### 컬러 팔레트
- **Primary**: `hsl(221.2 83.2% 53.3%)` - Blue
- **Secondary**: `hsl(262.1 83.3% 57.8%)` - Purple
- **Destructive**: `hsl(0 84.2% 60.2%)` - Red
- **Muted**: `hsl(210 40% 96.1%)` - Gray

### 컴포넌트
프로젝트는 Shadcn/UI를 기반으로 합니다. 필요한 컴포넌트는 다음과 같이 추가할 수 있습니다:

```bash
# 예: Dialog 컴포넌트 추가
npx shadcn-ui@latest add dialog
```

## 📱 주요 페이지

### 로그인 (`/login`)
- Supabase Auth 연동
- 이메일/비밀번호 로그인

### 대시보드 (`/dashboard`)
- 운영 통계 (주문, 고객, 매출)
- 최근 주문 목록

### 주문 관리 (`/dashboard/orders`)
- 전체 주문 목록
- 검색 및 필터링
- 주문 상세 보기
  - 5단계 타임라인
  - 고객 정보
  - 결제 정보
  - 배송 정보
  - 입출고 영상

## 🔐 인증 및 보안

### Supabase Auth
```typescript
import { supabase } from '@/lib/supabase'

// 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// 로그아웃
await supabase.auth.signOut()
```

### Row Level Security (RLS)
모든 데이터는 Supabase RLS로 보호됩니다.

## 🧪 테스트

Windows에서는 `npm run build`를 돌리지 않는다. 맥북에서 `main` pull 후 타입체크·빌드를 이어간다.

```bash
# 광고 성과 (가입 CPA · 주문 CPA · CAC)
npx tsx lib/ad-performance.test.ts

# 입고·출고 스캔 / 관리자 미디어 조회
npx tsx lib/barcode.test.ts
npx tsx lib/ops-camera.test.ts
npx tsx lib/admin-media.test.ts
npx tsx lib/order-ops-journey.test.ts

# DB 목업 1건 생성 → 검증 → 삭제
npx tsx lib/admin-media.live.test.ts
npx tsx lib/order-ops-journey.live.test.ts

# 타입 체크 (맥북에서 이어서)
npm run type-check

# 린트
npm run lint
```

## 📦 배포

### Vercel (권장)

1. Vercel에 프로젝트 연결
2. 환경변수 설정
3. 자동 배포

```bash
# Vercel CLI 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 환경변수 (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

## 📚 참고 자료

- [Next.js 문서](https://nextjs.org/docs)
- [Shadcn/UI 문서](https://ui.shadcn.com)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [React Query 문서](https://tanstack.com/query/latest)
- [Supabase JS 문서](https://supabase.com/docs/reference/javascript)

## 🤝 기여

1. Feature 브랜치 생성
2. 변경사항 커밋
3. Pull Request 생성

## 라이선스

Private Project

