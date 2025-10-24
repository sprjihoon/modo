# 모두의수선 - 아키텍처 설계

## 📐 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
├──────────────────────┬──────────────────────────────────────┤
│   Mobile App         │       Admin Web                      │
│   (Flutter)          │       (Next.js)                      │
└──────────┬───────────┴───────────────┬──────────────────────┘
           │                           │
           │ REST API                  │ REST API
           ↓                           ↓
┌──────────────────────────────────────────────────────────────┐
│               Supabase Edge Functions (Deno)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ shipments   │  │ payments     │  │ videos       │       │
│  │ -book       │  │ -verify      │  │ -upload      │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└──────────┬──────────────┬────────────────┬──────────────────┘
           │              │                │
           ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                   Supabase Postgres                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐          │
│  │ users   │ │ orders  │ │shipments │ │payments │          │
│  └─────────┘ └─────────┘ └──────────┘ └─────────┘          │
│  ┌─────────┐ ┌──────────────────────────────────┐          │
│  │ videos  │ │     notifications                │          │
│  └─────────┘ └──────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
           │              │                │
           ↓              ↓                ↓
┌──────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 우체국 API    │ │ PortOne      │ │ Cloudflare   │        │
│  │ (송장/배송)   │ │ (결제)        │ │ Stream       │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐                                           │
│  │ Firebase FCM │                                           │
│  │ (푸시 알림)   │                                           │
│  └──────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

## 🎯 핵심 설계 원칙

### 1. tracking_no 중심 설계
모든 데이터는 송장번호(`tracking_no`)를 중심으로 연결됩니다.

```
order → tracking_no → shipment → videos
                   ↓
               tracking events
```

### 2. 비대면 프로세스
고객과 수선센터 간 직접 접촉 없이 전 과정 진행

### 3. 영상 기반 투명성
입고/출고 영상으로 고객 신뢰 확보

### 4. 보안 우선
- Supabase RLS로 데이터 접근 제어
- Edge Functions로 민감한 API 키 보호
- 클라이언트에서는 Anon Key만 사용

## 📱 클라이언트 아키텍처

### Mobile App (Flutter)

```
lib/
├── main.dart                    # 엔트리포인트
├── app.dart                     # 메인 앱
├── core/                        # 핵심 기능
│   ├── config/                  # 설정
│   ├── theme/                   # 테마
│   ├── router/                  # 라우팅
│   └── utils/                   # 유틸리티
├── features/                    # 기능별 모듈
│   ├── auth/                    # 인증
│   ├── home/                    # 홈
│   ├── orders/                  # 주문
│   └── videos/                  # 영상
├── models/                      # 데이터 모델
├── providers/                   # Riverpod
├── services/                    # API 서비스
└── widgets/                     # 공통 위젯
```

**상태 관리**: Riverpod  
**라우팅**: go_router  
**HTTP**: dio  
**로컬 저장소**: shared_preferences

### Admin Web (Next.js)

```
app/
├── layout.tsx                   # 루트 레이아웃
├── providers.tsx                # React Query
├── login/                       # 로그인
└── dashboard/                   # 대시보드
    ├── page.tsx                 # 메인
    ├── orders/                  # 주문 관리
    ├── customers/               # 고객 관리
    └── videos/                  # 영상 관리
components/
├── dashboard/                   # 대시보드
├── orders/                      # 주문
└── ui/                          # Shadcn UI
```

**UI**: Shadcn/UI + Tailwind  
**데이터 페칭**: React Query  
**폼**: React Hook Form + Zod

## 🔄 데이터 플로우

### 1. 주문 생성 플로우

```
[Mobile] 수선 접수
    ↓
[Mobile] 사진 업로드 (Supabase Storage)
    ↓
[Mobile] 가격 확인
    ↓
[Mobile] PortOne 결제
    ↓
[Edge] /payments-verify
    ↓
[DB] orders.status = 'PAID'
    ↓
[FCM] 결제 완료 푸시
```

### 2. 수거예약 플로우

```
[Mobile] 수거 일정 선택
    ↓
[Edge] /shipments-book
    ↓
[우체국 API] 송장 선발행
    ↓
[DB] shipments 생성 (tracking_no)
    ↓
[DB] orders.tracking_no = tracking_no
    ↓
[FCM] 수거예약 완료 푸시
```

### 3. 입고 플로우

```
[Admin] 택배 수령
    ↓
[Admin] 입고 영상 촬영
    ↓
[Edge] /videos-upload (INBOUND)
    ↓
[Cloudflare Stream] 영상 업로드
    ↓
[DB] videos 생성
    ↓
[DB] shipments.status = 'INBOUND'
    ↓
[FCM] 입고 완료 + 영상 푸시
    ↓
[Mobile] HLS 재생
```

### 4. 수선 → 출고 플로우

```
[Admin] 수선 작업
    ↓
[DB] shipments.status = 'PROCESSING'
    ↓
[FCM] 수선 시작 푸시
    ↓
[Admin] 수선 완료 + 출고 영상
    ↓
[Edge] /videos-upload (OUTBOUND)
    ↓
[DB] shipments.status = 'READY_TO_SHIP'
    ↓
[FCM] 출고 완료 + 영상 푸시
    ↓
[우체국 API] 배송 시작
    ↓
[Mobile] 배송 추적
```

## 🔐 보안 설계

### 인증 계층

```
┌─────────────────────────────────────┐
│   Supabase Auth (JWT)               │
│   - Email/Password                  │
│   - OAuth (Google, Apple)           │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Row Level Security (RLS)          │
│   - 사용자별 데이터 격리              │
│   - 관리자 권한 체크                  │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Edge Functions (Service Role)     │
│   - 외부 API 호출                    │
│   - 비즈니스 로직 검증                │
└─────────────────────────────────────┘
```

### RLS 정책 예시

```sql
-- 사용자는 자신의 주문만 조회
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE auth_id = auth.uid()
    )
  );

-- 관리자는 모든 주문 조회
CREATE POLICY "Admins can view all"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );
```

## 🎬 영상 처리 아키텍처

### Cloudflare Stream 통합

```
[Admin] 영상 선택
    ↓
[Edge] /videos-upload
    ↓
[Cloudflare Stream API]
    - Direct Creator Upload
    - 또는 Tus Protocol
    ↓
[Cloudflare] 자동 인코딩
    - HLS 스트림 생성
    - 썸네일 생성
    - 여러 해상도 지원
    ↓
[DB] stream_url 저장
    ↓
[Mobile] HLS 재생 (video_player)
```

### 영상 URL 구조

```
# HLS Manifest
https://customer-{subdomain}.cloudflarestream.com/{video_id}/manifest/video.m3u8

# 썸네일
https://customer-{subdomain}.cloudflarestream.com/{video_id}/thumbnails/thumbnail.jpg
```

## 📊 데이터베이스 설계

### ER 다이어그램

```
users (1) ──< (N) orders (1) ──< (1) shipments
                  │                     │
                  │                     └──< videos (N)
                  │
                  └──< (1) payments
```

### 인덱스 전략

- `tracking_no`: 모든 조회의 핵심
- `user_id`: 사용자별 데이터 필터링
- `status`: 상태별 필터링
- `created_at`: 시간순 정렬

## 🚀 배포 아키텍처

### Development

```
Mobile → Firebase App Distribution
Admin  → Vercel Preview
Edge   → Supabase (develop branch)
DB     → Supabase (develop project)
```

### Production

```
Mobile → App Store / Play Store
Admin  → Vercel Production
Edge   → Supabase (main branch)
DB     → Supabase (production project)
```

## 📈 확장성 고려사항

### 수평 확장
- Supabase는 자동 스케일링
- Edge Functions는 serverless로 자동 확장
- Cloudflare Stream은 글로벌 CDN

### 수직 확장
- DB 인스턴스 업그레이드
- 인덱스 최적화
- 쿼리 최적화

### 캐싱 전략
- React Query로 클라이언트 캐싱
- Supabase Realtime으로 자동 동기화
- Cloudflare Stream CDN 캐싱

## 🔍 모니터링

### 로그
- Supabase Dashboard (DB 로그)
- Edge Functions 로그
- Vercel 로그

### 성능
- Supabase Performance Insights
- Vercel Analytics
- Cloudflare Stream Analytics

### 에러 추적
- Sentry (선택사항)
- Firebase Crashlytics (Mobile)

## 📚 기술 스택 요약

| 레이어 | 기술 |
|--------|------|
| Mobile | Flutter, Riverpod, Supabase |
| Admin | Next.js, React Query, Shadcn/UI |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage, Cloudflare Stream |
| Auth | Supabase Auth |
| Payment | PortOne (아임포트) |
| Logistics | 우체국 API |
| Push | Firebase Cloud Messaging |
| Deployment | Vercel, Firebase, Supabase |

## 🎯 MVP vs 확장 계획

### MVP (1차)
- ✅ 기본 주문 플로우
- ✅ 결제 (PortOne)
- ✅ 수거예약 (Mock)
- ✅ 입출고 영상
- ✅ 푸시 알림

### 2차
- 실제 우체국 API 연동
- 추가 결제 기능
- 고객 센터 채팅
- 통계 대시보드

### 3차
- AI 기반 수선 견적
- 다국어 지원
- 구독 서비스
- 파트너 수선센터 확장

