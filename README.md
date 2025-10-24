# 🧵 모두의수선 (MODU'S REPAIR)

> 비대면 의류 수선 플랫폼 v1.0

## 📖 프로젝트 소개

**모두의수선**은 고객이 모바일 앱에서 의류 수선을 접수하고, 결제 및 수거예약을 진행한 후, 수선센터에서 입고/출고 과정을 영상으로 관리하며, 송장번호를 중심으로 모든 데이터를 일원화하는 비대면 수선 플랫폼입니다.

## 🎯 핵심 특징

- **송장번호 중심 아키텍처**: `tracking_no`가 모든 데이터의 FK 및 통합 식별자
- **영상 기반 투명성**: 입고/출고 영상을 Cloudflare Stream으로 관리
- **완전 비대면 프로세스**: 수거예약부터 배송까지 자동화
- **실시간 진행상황**: 5단계 타임라인으로 수선 진행 추적
- **안전한 결제**: PortOne(아임포트) 연동
- **우체국 연동**: 수거예약 + 송장발급 + 배송추적

## 📦 시스템 구조

```
modo/
├── apps/
│   ├── mobile/          # Flutter 고객용 앱
│   ├── admin/           # Next.js 관리자 웹 콘솔
│   ├── edge/            # Supabase Edge Functions (백엔드 API)
│   └── sql/             # Postgres DDL 및 마이그레이션
├── docs/                # 기획, 설계, API 문서
├── .env.example         # 환경변수 템플릿
└── README.md            # 이 파일
```

## 🧩 기술 스택

### Frontend
- **Mobile**: Flutter, Dart, Riverpod, go_router
- **Admin**: Next.js 14, TypeScript, Shadcn/UI, React Query

### Backend & Infrastructure
- **Database & Auth**: Supabase (Postgres + Auth + Storage + Realtime)
- **Serverless API**: Supabase Edge Functions (Deno)
- **Video Storage**: Cloudflare Stream
- **Payment**: PortOne (아임포트)
- **Logistics**: 우체국 API (수거예약 + 송장 + 배송추적)
- **Push Notification**: Firebase Cloud Messaging

### DevOps
- **Version Control**: GitHub
- **CI/CD**: Vercel (admin), Firebase App Distribution (mobile)
- **Monitoring**: Supabase Dashboard, Cloudflare Analytics

## ⚙️ 핵심 아키�ecture

### 송장번호 기반 데이터 플로우

```
고객 수선 접수
    ↓
결제 완료
    ↓
수거예약 + 송장 선발행 (tracking_no 생성)
    ↓
입고 → 영상 업로드 → 고객 확인
    ↓
수선 진행
    ↓
출고 → 영상 업로드 → 고객 확인
    ↓
배송 추적 (tracking_no로 실시간 조회)
```

### 5단계 타임라인

1. **BOOKED** - 수거예약 완료
2. **INBOUND** - 입고 완료 (입고 영상)
3. **PROCESSING** - 수선 중
4. **READY_TO_SHIP** - 출고 완료 (출고 영상)
5. **DELIVERED** - 배송 완료

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+ (admin, edge)
- Flutter 3.16+ (mobile)
- Deno 1.40+ (edge functions)
- Supabase CLI
- Git

### 환경 설정

1. 저장소 클론
```bash
git clone <repository-url>
cd modo
```

2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값 입력
```

3. 각 앱별 설치 및 실행

#### Mobile (Flutter)
```bash
cd apps/mobile
flutter pub get
flutter run
```

#### Admin (Next.js)
```bash
cd apps/admin
npm install
npm run dev
```

#### Edge Functions (Supabase)
```bash
cd apps/edge
supabase functions serve
```

#### SQL (Database)
```bash
cd apps/sql
# Supabase Dashboard에서 마이그레이션 실행
# 또는 Supabase CLI 사용
supabase db push
```

## 📱 1차(MVP) 목표 기능

- [x] 프로젝트 구조 및 boilerplate 설정
- [ ] 로그인 (Supabase Auth)
- [ ] 수선 접수 (사진·옵션·가격·결제)
- [ ] 수거예약 + 송장발급 (우체국 API)
- [ ] 입고·출고 영상 업로드 및 HLS 재생
- [ ] 5단계 타임라인 UI
- [ ] 푸시 알림 (FCM)
- [ ] 관리자 웹: 주문리스트/상세, 상태변경, 영상업로드, 송장출력
- [ ] 결제/추가비용 결제
- [ ] 로그/보안 정책 적용

## 🧭 개발 규칙

### 코드 컨벤션
- **커밋 메시지**: Conventional Commits (feat:, fix:, chore:, docs:)
- **타입 정의**: 명시적으로 정의 (TypeScript/Flutter 모델)
- **주석**: 기능 의도 중심 (WHY > HOW)

### 보안
- 모든 비밀키는 `.env`에 저장
- Git에 절대 커밋하지 않음
- Supabase RLS로 데이터 접근 제어

### 테스트
- Mock API 우선 개발
- 실제 API 연동은 Edge Function 단계에서 적용

### 배포
- Admin: Vercel 자동 배포
- Mobile: Firebase App Distribution
- Edge Functions: Supabase CLI

## 📚 문서

상세한 문서는 `docs/` 폴더를 참조하세요:

- [아키텍처 설계](docs/architecture.md)
- [API 명세](docs/api-spec.md)
- [데이터베이스 스키마](docs/database-schema.md)
- [배포 가이드](docs/deployment.md)

## 🤝 기여하기

1. Feature 브랜치 생성 (`git checkout -b feat/amazing-feature`)
2. 변경사항 커밋 (`git commit -m 'feat: Add amazing feature'`)
3. 브랜치에 Push (`git push origin feat/amazing-feature`)
4. Pull Request 생성

## 📄 라이선스

이 프로젝트는 private 프로젝트입니다.

## 📞 연락처

프로젝트 관련 문의: [이메일 주소]

---

**Built with ❤️ for better repair service**

