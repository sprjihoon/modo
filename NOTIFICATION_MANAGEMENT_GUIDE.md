# 📢 알림 템플릿 & 공지사항 시스템 가이드

## 🎯 구현 개요

관리자가 **알림 메시지를 직접 관리**하고 **공지사항을 전체 고객에게 푸시 발송**할 수 있는 시스템입니다.

### ✨ 주요 기능

1. **알림 템플릿 관리**
   - 각 액션별 알림 메시지 커스터마이징
   - 제목/본문 자유롭게 편집
   - 변수 치환 지원 (예: `{{order_number}}`)
   - 활성화/비활성화 토글

2. **공지사항 작성 & 발송**
   - 공지사항 작성 (제목, 내용, 유형)
   - 전체 고객에게 푸시 알림 발송
   - 발송 대상 선택 (전체/활성 사용자/최근 주문자)
   - 발송 통계 확인

3. **공지사항 히스토리**
   - 모든 공지사항 기록 보관
   - 발송 상태 추적
   - 읽음 표시 기능

---

## 📦 생성된 파일 (총 7개)

### 1. 데이터베이스 (1개)

```
apps/sql/migrations/add_notification_templates_and_announcements.sql
```

**기능**:
- `notification_templates` 테이블 (알림 템플릿)
- `announcements` 테이블 (공지사항)
- `announcement_reads` 테이블 (읽음 기록)
- 기본 템플릿 13개 자동 삽입
- 헬퍼 함수 4개 구현

### 2. Edge Function (1개)

```
apps/edge/supabase/functions/send-announcement-push/index.ts
```

**기능**:
- FCM 멀티캐스트로 전체 고객에게 푸시 발송
- 최대 1000명씩 배치 처리
- 발송 통계 자동 업데이트

### 3. 관리자 페이지 (2개)

```
apps/admin/app/dashboard/notifications/templates/page.tsx
apps/admin/app/dashboard/notifications/announcements/page.tsx
```

**기능**:
- 알림 템플릿 목록/편집
- 공지사항 작성/발송/관리
- 실시간 통계 확인

### 4. Flutter 고객 앱 (2개)

```
apps/mobile/lib/features/announcements/presentation/pages/announcements_page.dart
apps/mobile/lib/features/announcements/presentation/pages/announcement_detail_page.dart
```

**기능**:
- 공지사항 목록 (읽지 않음 표시)
- 공지사항 상세 (자동 읽음 표시)
- 고정 공지사항 최상단 노출

### 5. 문서 (1개)

```
NOTIFICATION_MANAGEMENT_GUIDE.md (이 문서)
```

---

## 🗂️ 데이터베이스 스키마

### A. notification_templates 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본키 |
| template_key | TEXT | 템플릿 고유 키 (예: `order_paid`) |
| template_name | TEXT | 템플릿 이름 |
| category | TEXT | 카테고리 (order_status/extra_charge) |
| title | TEXT | 알림 제목 |
| body | TEXT | 알림 본문 |
| is_active | BOOLEAN | 활성화 여부 |
| variables | JSONB | 사용 가능한 변수 |
| is_default | BOOLEAN | 시스템 기본 템플릿 여부 |

**기본 템플릿 (13개)**:
- `order_paid` - 결제 완료
- `order_booked` - 수거예약 완료
- `order_inbound` - 입고 완료
- `order_processing` - 수선 중
- `order_hold` - 작업 대기
- `order_ready_to_ship` - 출고 완료
- `order_delivered` - 배송 완료
- `order_return_pending` - 반송 대기
- `order_cancelled` - 주문 취소
- `extra_charge_pending` - 추가 결제 요청
- `extra_charge_completed` - 추가 결제 완료
- `extra_charge_skipped` - 원안대로 진행
- `extra_charge_return` - 반송 요청

### B. announcements 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본키 |
| title | TEXT | 공지 제목 |
| content | TEXT | 공지 내용 |
| type | TEXT | 유형 (general/urgent/maintenance/promotion) |
| status | TEXT | 상태 (draft/scheduled/sending/sent/failed) |
| send_push | BOOLEAN | 푸시 발송 여부 |
| target_audience | TEXT | 발송 대상 (all/active_users/recent_orders) |
| scheduled_at | TIMESTAMPTZ | 예약 발송 시각 |
| sent_at | TIMESTAMPTZ | 실제 발송 시각 |
| total_recipients | INTEGER | 총 수신자 수 |
| push_sent_count | INTEGER | 성공 건수 |
| push_failed_count | INTEGER | 실패 건수 |
| is_pinned | BOOLEAN | 상단 고정 여부 |

### C. announcement_reads 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본키 |
| announcement_id | UUID | 공지사항 ID |
| user_id | UUID | 사용자 ID |
| read_at | TIMESTAMPTZ | 읽은 시각 |

---

## 🚀 배포 가이드

### Step 1: 데이터베이스 마이그레이션

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 파일 경로
apps/sql/migrations/add_notification_templates_and_announcements.sql
```

**확인**:
```sql
-- 템플릿 확인
SELECT count(*) FROM public.notification_templates;
-- 결과: 13개

-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('notification_templates', 'announcements', 'announcement_reads');
```

### Step 2: Edge Function 배포

```bash
cd apps/edge/supabase

# 로그인
supabase login

# 함수 배포
supabase functions deploy send-announcement-push
```

**환경 변수 확인**:
Supabase Dashboard > Edge Functions > Secrets에 `FCM_SERVER_KEY`가 설정되어 있어야 합니다.

### Step 3: 관리자 페이지 접근

관리자 로그인 후 다음 URL로 접근:

```
/dashboard/notifications/templates     # 알림 템플릿 관리
/dashboard/notifications/announcements  # 공지사항 관리
```

**참고**: 관리자 메뉴에 링크를 추가해야 합니다 (아래 참고).

### Step 4: Flutter 앱 통합

#### A. `pubspec.yaml`에 패키지 추가

```yaml
dependencies:
  url_launcher: ^6.2.0  # 링크 열기용
```

#### B. 라우팅 추가 (`app_router.dart`)

```dart
GoRoute(
  path: '/announcements',
  builder: (context, state) => const AnnouncementsPage(),
),
GoRoute(
  path: '/announcements/:id',
  builder: (context, state) {
    final id = state.pathParameters['id']!;
    // announcement 데이터 조회 후 전달
    return AnnouncementDetailPage(announcement: {...});
  },
),
```

#### C. 홈 화면 또는 메뉴에 링크 추가

```dart
ListTile(
  leading: const Icon(Icons.notifications),
  title: const Text('공지사항'),
  onTap: () => context.go('/announcements'),
)
```

---

## 📱 사용 방법

### 1. 알림 템플릿 커스터마이징

1. 관리자 페이지 접속: `/dashboard/notifications/templates`
2. 편집할 템플릿 찾기
3. **[편집]** 버튼 클릭
4. 제목/본문 수정
   - 변수 사용 가능: `{{order_number}}`, `{{price}}` 등
5. **[저장]** 클릭

**예시**:
```
기존: 주문({{order_number}})의 결제가 완료되었습니다.
수정: 🎉 주문({{order_number}}) 결제 완료! 곧 수거 예약을 진행해주세요.
```

### 2. 공지사항 작성 및 발송

1. 관리자 페이지 접속: `/dashboard/notifications/announcements`
2. **[새 공지사항]** 버튼 클릭
3. 내용 입력:
   - 제목
   - 내용
   - 유형 (일반/긴급/점검/프로모션)
   - 발송 대상 선택
   - 푸시 알림 발송 체크
   - 상단 고정 체크 (선택사항)
4. **[저장]** 클릭 (임시저장)
5. 목록에서 **[발송]** 버튼 클릭
6. 확인 다이얼로그에서 **[확인]** 클릭

**발송 대상**:
- **전체 사용자**: FCM 토큰이 있는 모든 고객
- **활성 사용자 (30일 내)**: 최근 30일 내 주문이 있는 고객
- **최근 주문자 (7일 내)**: 최근 7일 내 주문한 고객

### 3. 고객 앱에서 공지사항 확인

1. 앱 실행
2. 메뉴에서 **[공지사항]** 선택
3. 목록에서 공지사항 클릭
4. 자동으로 읽음 표시됨

**읽지 않은 공지사항**:
- 빨간 점 표시
- 굵은 글씨 표시

**고정 공지사항**:
- 📌 아이콘 표시
- 목록 최상단 노출

---

## 📊 발송 흐름

```
[관리자가 공지사항 작성]
         ↓
   [임시저장 상태]
         ↓
[관리자가 [발송] 버튼 클릭]
         ↓
[Edge Function 호출]
 (send-announcement-push)
         ↓
[대상 사용자 FCM 토큰 조회]
 (get_all_fcm_tokens)
         ↓
[FCM 멀티캐스트 발송]
 (최대 1000명씩 배치)
         ↓
[발송 통계 업데이트]
 (announcements 테이블)
         ↓
[고객 디바이스에 푸시 표시]
         ↓
[고객이 공지사항 확인]
         ↓
[자동 읽음 표시]
 (announcement_reads 테이블)
```

---

## 🎨 변수 치환 시스템

알림 템플릿에서 사용 가능한 변수:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `{{order_number}}` | 주문 번호 | ORD1234567890 |
| `{{price}}` | 금액 | 10,000 |
| `{{customer_name}}` | 고객명 | 홍길동 |
| `{{item_name}}` | 상품명 | 남성 정장 바지 |

**사용 예시**:

템플릿:
```
주문({{order_number}})의 {{item_name}} 수선이 완료되어 출고되었습니다.
```

실제 발송:
```
주문(ORD1234567890)의 남성 정장 바지 수선이 완료되어 출고되었습니다.
```

---

## 📈 통계 및 모니터링

### 공지사항 발송 통계 조회

```sql
-- 최근 발송된 공지사항 통계
SELECT 
  title,
  total_recipients,
  push_sent_count,
  push_failed_count,
  ROUND(100.0 * push_sent_count / NULLIF(total_recipients, 0), 2) as success_rate,
  sent_at
FROM public.announcements
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

### 읽지 않은 공지사항 통계

```sql
-- 공지사항별 읽음률
SELECT 
  a.title,
  COUNT(DISTINCT ar.user_id) as read_count,
  (SELECT COUNT(*) FROM public.users WHERE role = 'CUSTOMER') as total_users,
  ROUND(100.0 * COUNT(DISTINCT ar.user_id) / (SELECT COUNT(*) FROM public.users WHERE role = 'CUSTOMER'), 2) as read_rate
FROM public.announcements a
LEFT JOIN public.announcement_reads ar ON a.id = ar.announcement_id
WHERE a.status = 'sent'
GROUP BY a.id, a.title
ORDER BY a.sent_at DESC;
```

---

## 🔧 관리자 메뉴 추가

관리자 레이아웃에 메뉴 링크 추가:

`apps/admin/app/dashboard/layout.tsx`:

```tsx
const menuItems = [
  // ... 기존 메뉴
  {
    title: '알림 관리',
    icon: NotificationsIcon,
    items: [
      {
        title: '알림 템플릿',
        href: '/dashboard/notifications/templates',
      },
      {
        title: '공지사항',
        href: '/dashboard/notifications/announcements',
      },
    ],
  },
]
```

---

## 🐛 트러블슈팅

### 문제 1: 템플릿이 조회되지 않음

**증상**: 관리자 페이지에서 템플릿 목록이 비어있음

**원인**: 마이그레이션 미실행 또는 RLS 정책 문제

**해결**:
```sql
-- 템플릿 개수 확인
SELECT COUNT(*) FROM public.notification_templates;

-- 0이면 기본 템플릿 재삽입
-- 마이그레이션 파일의 INSERT 부분만 다시 실행
```

### 문제 2: 공지사항 발송 실패

**증상**: 발송 버튼 클릭 후 실패 메시지

**원인**:
- Edge Function 미배포
- FCM_SERVER_KEY 미설정
- 대상 사용자에게 FCM 토큰 없음

**해결**:
```bash
# Edge Function 재배포
supabase functions deploy send-announcement-push

# 토큰 있는 사용자 확인
SELECT COUNT(*) FROM public.users WHERE fcm_token IS NOT NULL;
```

### 문제 3: 푸시는 발송되었는데 앱에서 공지사항이 안 보임

**원인**: RLS 정책 문제 또는 상태가 'sent'가 아님

**해결**:
```sql
-- 공지사항 상태 확인
SELECT id, title, status FROM public.announcements ORDER BY created_at DESC;

-- 수동으로 상태 변경
UPDATE public.announcements
SET status = 'sent'
WHERE id = 'your-announcement-id';
```

---

## ✅ 체크리스트

배포 전 확인:

- [ ] SQL 마이그레이션 실행 완료
- [ ] 기본 템플릿 13개 생성 확인
- [ ] Edge Function 배포 완료
- [ ] FCM_SERVER_KEY 환경 변수 설정
- [ ] 관리자 메뉴에 링크 추가
- [ ] Flutter 앱 라우팅 추가
- [ ] 테스트 공지사항 작성/발송 성공
- [ ] 고객 앱에서 공지사항 확인 가능
- [ ] 읽음 표시 동작 확인

---

## 📞 추가 개선 사항

향후 구현 가능한 기능:

1. **예약 발송**: 특정 시각에 자동 발송
2. **이미지 첨부**: 공지사항에 이미지 추가
3. **A/B 테스트**: 여러 버전의 메시지 테스트
4. **템플릿 버전 관리**: 변경 이력 추적
5. **푸시 재발송**: 실패한 사용자에게 재전송
6. **통계 대시보드**: 읽음률, 클릭률 등 시각화

---

## 🎉 구현 완료!

이제 관리자가 **알림 메시지를 자유롭게 커스터마이징**하고 **공지사항을 전체 고객에게 푸시 발송**할 수 있습니다!

모든 공지사항은 **히스토리로 기록**되어 추후 확인 가능하며, 고객 앱에서 **읽지 않은 공지사항 표시**도 지원합니다.

