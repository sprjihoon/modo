# 📱 푸시 알림 시스템 구현 완료 ✅

## 🎯 구현 목표

주문 상태가 변경될 때마다 고객의 디바이스에 **자동으로 푸시 알림을 발송**하는 시스템 구축

---

## ✨ 구현된 기능

### 1. 알림 발송 시점 (자동)

주문 상태 변경 시:
- ✅ 결제 완료 (`PAID`)
- ✅ 수거예약 완료 (`BOOKED`)
- ✅ 입고 완료 (`INBOUND`)
- ✅ 수선 중 (`PROCESSING`)
- ✅ 작업 대기 (`HOLD`)
- ✅ 출고 완료 (`READY_TO_SHIP`)
- ✅ 배송 완료 (`DELIVERED`)
- ✅ 반송 대기 (`RETURN_PENDING`)
- ✅ 주문 취소 (`CANCELLED`)

추가 과금 상태 변경 시:
- ✅ 추가 결제 요청 (`PENDING_CUSTOMER`)
- ✅ 추가 결제 완료 (`COMPLETED`)
- ✅ 원안대로 진행 (`SKIPPED`)
- ✅ 반송 요청 (`RETURN_REQUESTED`)

### 2. 핵심 기능

- ✅ **FCM 토큰 자동 저장**: 로그인 시 디바이스 토큰을 Supabase에 저장
- ✅ **Database Trigger**: 주문 상태 변경 자동 감지
- ✅ **알림 이벤트 로깅**: 모든 알림 발송 기록 저장
- ✅ **재시도 메커니즘**: 실패 시 최대 3회 재시도
- ✅ **포그라운드/백그라운드 수신**: 앱 상태와 관계없이 알림 수신
- ✅ **알림 탭 처리**: 알림 클릭 시 주문 상세 화면으로 이동
- ✅ **상태별 메시지 템플릿**: 각 상태에 맞는 알림 문구 자동 생성

---

## 📦 생성된 파일 (총 6개)

### 1. Flutter (Dart) - 1개

```
apps/mobile/lib/services/notification_service.dart
```

**기능**:
- FCM 초기화 및 토큰 관리
- 알림 권한 요청
- 포그라운드/백그라운드 메시지 수신
- 로컬 알림 표시
- 알림 탭 핸들러

### 2. SQL 마이그레이션 - 1개

```
apps/sql/migrations/add_order_notification_trigger.sql
```

**기능**:
- `notification_events` 테이블 생성 (알림 로그)
- Database Trigger 생성 (주문 상태 변경 감지)
- 알림 메시지 템플릿 함수 2개:
  - `get_notification_message()` - 주문 상태 메시지
  - `get_extra_charge_notification_message()` - 추가 과금 메시지
- 알림 이벤트 생성 함수

### 3. Edge Functions (TypeScript) - 2개

```
apps/edge/supabase/functions/send-push-notification/index.ts
apps/edge/supabase/functions/process-pending-notifications/index.ts
```

**기능**:
- `send-push-notification`: FCM API 호출하여 실제 푸시 발송
- `process-pending-notifications`: 대기 중인 알림 일괄 처리 (Cron Job용)

### 4. 문서 - 2개

```
apps/mobile/PUSH_NOTIFICATION_SETUP.md     ← 상세 설정 가이드
PUSH_NOTIFICATION_IMPLEMENTATION_SUMMARY.md ← 이 문서
```

---

## 🔄 푸시 알림 흐름

```
┌─────────────────────┐
│  주문 상태 변경     │
│  (UPDATE orders)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Database Trigger    │
│ (자동 감지)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ notification_events │
│ 레코드 생성         │
│ (FCM 토큰 포함)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Edge Function       │
│ (process-pending-   │
│  notifications)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Edge Function       │
│ (send-push-         │
│  notification)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ FCM API             │
│ (Firebase)          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 고객 디바이스       │
│ 🔔 알림 표시        │
└─────────────────────┘
```

---

## 🗄️ 데이터베이스 스키마

### notification_events 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | UUID | 기본키 |
| `order_id` | UUID | 주문 ID |
| `user_id` | UUID | 사용자 ID |
| `event_type` | TEXT | 이벤트 타입 |
| `old_status` | TEXT | 이전 상태 |
| `new_status` | TEXT | 새 상태 |
| `notification_sent` | BOOLEAN | 발송 성공 여부 |
| `notification_sent_at` | TIMESTAMPTZ | 발송 시각 |
| `fcm_token` | TEXT | FCM 토큰 |
| `error_message` | TEXT | 에러 메시지 |
| `retry_count` | INTEGER | 재시도 횟수 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

---

## 🚀 배포 가이드

### 1단계: Firebase 설정

1. **Firebase 프로젝트 생성**
   - [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성

2. **Android 앱 등록**
   - `google-services.json` 다운로드
   - `apps/mobile/android/app/` 폴더에 배치

3. **iOS 앱 등록**
   - `GoogleService-Info.plist` 다운로드
   - Xcode에서 `ios/Runner` 폴더에 추가
   - APNs 인증서 업로드

4. **FCM Server Key 발급**
   - Firebase Console > 프로젝트 설정 > 클라우드 메시징
   - Server key 복사

### 2단계: Flutter 패키지 설치

```bash
cd apps/mobile

# pubspec.yaml에 추가
flutter pub add firebase_core
flutter pub add firebase_messaging
flutter pub add flutter_local_notifications
```

### 3단계: main.dart 수정

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'services/notification_service.dart';

// 백그라운드 핸들러 (최상위)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('백그라운드 메시지: ${message.notification?.title}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Firebase 초기화
  await Firebase.initializeApp();
  
  // 백그라운드 핸들러 등록
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Supabase 초기화
  await Supabase.initialize(/*...*/);
  
  // 알림 서비스 초기화
  await NotificationService().initialize();
  
  runApp(const MyApp());
}
```

### 4단계: 로그인/로그아웃 처리

**로그인 시**:
```dart
await NotificationService().onLogin();
```

**로그아웃 시**:
```dart
await NotificationService().onLogout();
```

### 5단계: SQL 마이그레이션 실행

Supabase Dashboard > SQL Editor:

```sql
-- 파일 실행
apps/sql/migrations/add_order_notification_trigger.sql
```

### 6단계: Edge Functions 배포

```bash
cd apps/edge/supabase

# Supabase CLI 로그인
supabase login

# 함수 배포
supabase functions deploy send-push-notification
supabase functions deploy process-pending-notifications
```

### 7단계: 환경 변수 설정

Supabase Dashboard > Edge Functions > Secrets:

```bash
FCM_SERVER_KEY=your-firebase-server-key-here
```

### 8단계: Cron Job 설정 (선택사항)

Supabase Dashboard에서 pg_cron 설정:

```sql
SELECT cron.schedule(
  'process-pending-notifications',
  '* * * * *', -- 매분 실행
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-pending-notifications',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## 🧪 테스트 체크리스트

### A. FCM 토큰 저장 테스트

```sql
-- 1. 앱에서 로그인
-- 2. Supabase에서 토큰 확인
SELECT email, fcm_token 
FROM public.users 
WHERE fcm_token IS NOT NULL;
```

### B. 주문 상태 변경 테스트

```sql
-- 1. 테스트 주문 상태 변경
UPDATE public.orders
SET status = 'BOOKED'
WHERE id = 'your-test-order-id';

-- 2. 알림 이벤트 생성 확인
SELECT * FROM public.notification_events
ORDER BY created_at DESC
LIMIT 5;

-- 3. 디바이스에서 푸시 수신 확인
```

### C. 수동 푸시 발송 테스트

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "test",
    "userId": "test",
    "title": "테스트 알림",
    "body": "푸시 알림 테스트입니다",
    "fcmToken": "your-device-fcm-token"
  }'
```

---

## 📊 알림 메시지 예시

### 주문 상태 알림

| 상태 | 제목 | 본문 |
|------|------|------|
| PAID | 결제 완료 | 주문(ORD123)의 결제가 완료되었습니다. |
| BOOKED | 수거예약 완료 | 주문(ORD123)의 수거예약이 완료되었습니다. 곧 방문 예정입니다. |
| INBOUND | 입고 완료 | 주문(ORD123)이 입고되었습니다. 곧 수선을 시작합니다. |
| PROCESSING | 수선 중 | 주문(ORD123)의 수선 작업이 시작되었습니다. |
| READY_TO_SHIP | 출고 완료 | 주문(ORD123)의 수선이 완료되어 출고되었습니다. |
| DELIVERED | 배송 완료 | 주문(ORD123)이 배송 완료되었습니다. 감사합니다! |

### 추가 과금 알림

| 상태 | 제목 | 본문 |
|------|------|------|
| PENDING_CUSTOMER | 추가 결제 요청 | 주문(ORD123)에 추가 작업이 필요합니다. 추가 금액: 10,000원 |
| COMPLETED | 추가 결제 완료 | 주문(ORD123)의 추가 결제가 완료되었습니다. 작업을 재개합니다. |

---

## 🔒 보안 고려사항

1. ✅ **FCM Server Key**: Edge Function 환경 변수로만 저장
2. ✅ **Service Role Key**: 클라이언트에 노출 금지
3. ✅ **RLS 적용**: `notification_events` 테이블에 Row Level Security 적용
4. ✅ **권한 검증**: 인증된 사용자만 FCM 토큰 저장 가능
5. ✅ **개인정보 보호**: 알림 내용에 민감 정보 미포함

---

## 📈 모니터링 쿼리

### 오늘 발송된 알림 통계

```sql
SELECT 
  event_type,
  notification_sent,
  COUNT(*) as count
FROM public.notification_events
WHERE created_at >= CURRENT_DATE
GROUP BY event_type, notification_sent;
```

### 발송 실패 알림 조회

```sql
SELECT 
  id,
  order_id,
  event_type,
  new_status,
  error_message,
  retry_count
FROM public.notification_events
WHERE notification_sent = FALSE
  AND retry_count < 3
ORDER BY created_at DESC
LIMIT 20;
```

### 상태별 알림 발송률

```sql
SELECT 
  new_status,
  COUNT(*) as total,
  SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) as sent,
  ROUND(100.0 * SUM(CASE WHEN notification_sent THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM public.notification_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY new_status
ORDER BY total DESC;
```

---

## 🐛 트러블슈팅

### 문제 1: FCM 토큰이 null

**증상**: `users.fcm_token`이 null

**원인**:
- 알림 권한 거부
- Firebase 초기화 실패
- `NotificationService().onLogin()` 미호출

**해결**:
```dart
// 알림 권한 확인
final settings = await FirebaseMessaging.instance.getNotificationSettings();
print('알림 권한: ${settings.authorizationStatus}');

// 재초기화
await NotificationService().initialize();
await NotificationService().onLogin();
```

### 문제 2: 알림이 발송되지 않음

**증상**: `notification_sent = false`인 채로 유지

**원인**:
- FCM Server Key 오류
- Edge Function 미배포
- Cron Job 미설정

**해결**:
```bash
# Edge Function 로그 확인
supabase functions logs send-push-notification

# 수동으로 처리
curl -X POST 'https://your-project.supabase.co/functions/v1/process-pending-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### 문제 3: iOS에서 알림 미수신

**원인**:
- APNs 인증서 미설정
- Push Notifications Capability 미추가

**해결**:
1. Firebase Console에서 APNs 인증서 업로드 확인
2. Xcode > Signing & Capabilities > Push Notifications 추가
3. Xcode > Signing & Capabilities > Background Modes > Remote notifications 체크

---

## ✅ 최종 체크리스트

배포 전 확인:

- [ ] Firebase 프로젝트 생성
- [ ] Android: `google-services.json` 배치
- [ ] iOS: `GoogleService-Info.plist` 배치 및 APNs 설정
- [ ] `pubspec.yaml`에 패키지 추가
- [ ] `main.dart`에 Firebase 초기화
- [ ] 로그인/로그아웃 시 FCM 토큰 처리
- [ ] SQL 마이그레이션 실행
- [ ] Edge Functions 배포
- [ ] FCM Server Key 환경 변수 설정
- [ ] Cron Job 설정 (선택)
- [ ] FCM 토큰 저장 테스트
- [ ] 푸시 알림 수신 테스트

---

## 📞 상세 가이드

전체 설정 가이드는 다음 문서를 참고하세요:

```
apps/mobile/PUSH_NOTIFICATION_SETUP.md
```

---

## 🎉 구현 완료!

주문 상태 변경 시 고객에게 자동으로 푸시 알림이 발송되는 시스템이 완성되었습니다!

**다음 단계**: 실제 배포 환경에서 Firebase 설정 후 테스트를 진행하세요.

