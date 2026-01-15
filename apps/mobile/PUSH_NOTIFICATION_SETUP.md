# 📱 푸시 알림 설정 가이드

## 개요

주문 상태가 변경될 때마다 고객에게 자동으로 푸시 알림을 보내는 시스템입니다.

**알림이 발송되는 시점**:
- ✅ 결제 완료 (`PAID`)
- ✅ 수거예약 완료 (`BOOKED`)
- ✅ 입고 완료 (`INBOUND`)
- ✅ 수선 중 (`PROCESSING`)
- ✅ 작업 대기 (`HOLD`)
- ✅ 출고 완료 (`READY_TO_SHIP`)
- ✅ 배송 완료 (`DELIVERED`)
- ✅ 반송 대기 (`RETURN_PENDING`)
- ✅ 주문 취소 (`CANCELLED`)
- ✅ 추가 결제 요청 (`extra_charge_status: PENDING_CUSTOMER`)
- ✅ 추가 결제 완료 등

---

## 🔧 1. Firebase 설정

### A. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **프로젝트 추가** 클릭
3. 프로젝트 이름 입력: `modu-repair` (또는 원하는 이름)
4. Google Analytics 사용 (선택사항)
5. 프로젝트 생성 완료

### B. Android 앱 추가

1. Firebase Console > 프로젝트 설정 > **Android 앱 추가**
2. **Android 패키지 이름** 입력:
   ```
   com.modorepair.mobile
   ```
   (실제 패키지명은 `android/app/build.gradle`에서 확인)
3. **google-services.json** 다운로드
4. 다운로드한 파일을 다음 위치에 배치:
   ```
   apps/mobile/android/app/google-services.json
   ```

### C. iOS 앱 추가

1. Firebase Console > 프로젝트 설정 > **iOS 앱 추가**
2. **iOS 번들 ID** 입력:
   ```
   com.modorepair.mobile
   ```
   (실제 번들 ID는 Xcode에서 확인)
3. **GoogleService-Info.plist** 다운로드
4. Xcode에서 `ios/Runner` 폴더에 추가

### D. FCM Server Key 발급

1. Firebase Console > 프로젝트 설정 > **클라우드 메시징**
2. **Server key** 복사 (또는 새로 생성)
3. Supabase Dashboard > Edge Functions > Secrets에 저장:
   ```
   FCM_SERVER_KEY=your-server-key-here
   ```

---

## 📦 2. Flutter 패키지 설치

`pubspec.yaml`에 다음 패키지 추가:

```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.9
  flutter_local_notifications: ^16.3.0
  provider: ^6.1.1
```

설치:
```bash
cd apps/mobile
flutter pub get
```

---

## 🔧 3. Android 설정

### A. `android/app/build.gradle`

```gradle
dependencies {
    // ... 기존 dependencies
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}

// 파일 하단에 추가
apply plugin: 'com.google.gms.google-services'
```

### B. `android/build.gradle`

```gradle
buildscript {
    dependencies {
        // ... 기존 dependencies
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### C. `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
    <application>
        <!-- ... 기존 내용 -->
        
        <!-- FCM 설정 -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="order_updates" />
        
        <service
            android:name="io.flutter.plugins.firebase.messaging.FlutterFirebaseMessagingBackgroundService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

---

## 🍎 4. iOS 설정

### A. Xcode에서 Capability 추가

1. Xcode에서 `ios/Runner.xcworkspace` 열기
2. Runner 타겟 선택 > **Signing & Capabilities**
3. **+ Capability** 클릭
4. **Push Notifications** 추가
5. **Background Modes** 추가 후 다음 체크:
   - ✅ Remote notifications
   - ✅ Background fetch

### B. Apple Developer Console에서 APNs 인증서 생성

1. [Apple Developer](https://developer.apple.com/) 로그인
2. Certificates, Identifiers & Profiles
3. Keys > **+** 버튼 클릭
4. Key 이름 입력, **Apple Push Notifications service (APNs)** 체크
5. 생성된 `.p8` 파일 다운로드
6. Firebase Console > 프로젝트 설정 > 클라우드 메시징 > **APNs 인증서** 업로드

---

## 💻 5. Flutter 앱 코드 통합

### A. `main.dart` 수정

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'services/notification_service.dart';

// 백그라운드 메시지 핸들러 (최상위에 선언)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('백그라운드 메시지: ${message.notification?.title}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Firebase 초기화
  await Firebase.initializeApp();
  
  // FCM 백그라운드 핸들러 등록
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Supabase 초기화
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  // 알림 서비스 초기화
  await NotificationService().initialize();
  
  runApp(const MyApp());
}
```

### B. 로그인 시 FCM 토큰 저장

`AuthProvider` 또는 로그인 처리 코드에 추가:

```dart
// 로그인 성공 후
await NotificationService().onLogin();
```

### C. 로그아웃 시 FCM 토큰 제거

```dart
// 로그아웃 전
await NotificationService().onLogout();
```

---

## 🗄️ 6. 데이터베이스 마이그레이션

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 파일 경로
apps/sql/migrations/add_order_notification_trigger.sql
```

실행 후 확인:
```sql
-- notification_events 테이블 확인
SELECT * FROM public.notification_events LIMIT 10;

-- Trigger 확인
SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'trigger_order_status_changed';
```

---

## ☁️ 7. Edge Function 배포

### A. Supabase CLI 설치

```bash
npm install -g supabase
supabase login
```

### B. Edge Functions 배포

```bash
cd apps/edge/supabase

# send-push-notification 함수 배포
supabase functions deploy send-push-notification

# process-pending-notifications 함수 배포
supabase functions deploy process-pending-notifications
```

### C. 환경 변수 설정

Supabase Dashboard > Edge Functions > Secrets:

```bash
FCM_SERVER_KEY=your-firebase-server-key-here
```

### D. Cron Job 설정 (선택사항)

대기 중인 알림을 주기적으로 처리:

Supabase Dashboard > Database > Functions > **Create a new function**:

```sql
-- 1분마다 실행
SELECT cron.schedule(
  'process-pending-notifications',
  '* * * * *', -- 매분
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-pending-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## 🧪 8. 테스트

### A. FCM 토큰 저장 확인

1. 앱 실행 후 로그인
2. 콘솔 로그에서 FCM 토큰 확인:
   ```
   📱 FCM 토큰: eXaMpLe...
   ✅ FCM 토큰 저장 완료
   ```
3. Supabase Dashboard에서 확인:
   ```sql
   SELECT email, fcm_token FROM public.users WHERE fcm_token IS NOT NULL;
   ```

### B. 주문 상태 변경 테스트

1. 테스트 주문 생성
2. Supabase Dashboard에서 상태 변경:
   ```sql
   UPDATE public.orders
   SET status = 'BOOKED'
   WHERE id = 'your-order-id';
   ```
3. `notification_events` 테이블 확인:
   ```sql
   SELECT * FROM public.notification_events ORDER BY created_at DESC LIMIT 5;
   ```
4. 푸시 알림 수신 확인

### C. 수동 푸시 발송 테스트

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "test-order-id",
    "userId": "test-user-id",
    "title": "테스트 알림",
    "body": "푸시 알림이 잘 작동합니다!",
    "fcmToken": "your-fcm-token"
  }'
```

---

## 📊 알림 발송 흐름

```
[주문 상태 변경]
      ↓
[Database Trigger 감지]
      ↓
[notification_events 레코드 생성]
      ↓
[Edge Function 호출]
 (process-pending-notifications)
      ↓
[FCM API 호출]
 (send-push-notification)
      ↓
[고객 디바이스에 알림 표시]
      ↓
[notification_events 업데이트]
 (notification_sent = true)
```

---

## 🔒 보안 고려사항

1. **FCM Server Key**: Edge Functions의 환경 변수로만 관리
2. **Service Role Key**: 절대 클라이언트에 노출하지 않음
3. **RLS**: `notification_events` 테이블에 RLS 적용 완료
4. **사용자 검증**: FCM 토큰은 인증된 사용자만 저장 가능

---

## 🐛 트러블슈팅

### 문제 1: FCM 토큰이 저장되지 않음

```
⚠️ 로그인하지 않아 FCM 토큰 저장 생략
```

**해결**: 로그인 후 `NotificationService().onLogin()` 호출 확인

### 문제 2: 알림이 수신되지 않음

**원인**:
- FCM Server Key가 잘못됨
- Android/iOS 설정 누락
- 알림 권한 거부됨

**해결**:
```dart
// 알림 권한 상태 확인
final settings = await FirebaseMessaging.instance.getNotificationSettings();
print('알림 권한: ${settings.authorizationStatus}');
```

### 문제 3: 백그라운드에서 알림 미수신

**원인**: `onBackgroundMessage` 핸들러 미등록

**해결**: `main.dart`에서 `FirebaseMessaging.onBackgroundMessage()` 호출 확인

### 문제 4: iOS에서 알림 미수신

**원인**:
- APNs 인증서 미설정
- Capability 누락

**해결**:
1. Firebase Console에서 APNs 인증서 업로드 확인
2. Xcode에서 Push Notifications Capability 확인

---

## 📈 모니터링

### 알림 발송 통계 조회

```sql
-- 오늘 발송된 알림 통계
SELECT 
  event_type,
  notification_sent,
  COUNT(*) as count
FROM public.notification_events
WHERE created_at >= CURRENT_DATE
GROUP BY event_type, notification_sent;
```

### 실패한 알림 조회

```sql
-- 발송 실패한 알림 (재시도 필요)
SELECT 
  id,
  order_id,
  event_type,
  new_status,
  error_message,
  retry_count,
  created_at
FROM public.notification_events
WHERE notification_sent = FALSE
  AND retry_count < 3
ORDER BY created_at DESC
LIMIT 20;
```

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Firebase 프로젝트 생성 완료
- [ ] Android: `google-services.json` 배치
- [ ] iOS: `GoogleService-Info.plist` 배치 및 APNs 설정
- [ ] Flutter 패키지 설치 완료
- [ ] `main.dart`에 Firebase 초기화 코드 추가
- [ ] 로그인/로그아웃 시 FCM 토큰 처리 추가
- [ ] SQL 마이그레이션 실행 완료
- [ ] Edge Functions 배포 완료
- [ ] FCM Server Key 환경 변수 설정
- [ ] FCM 토큰 저장 테스트 완료
- [ ] 푸시 알림 수신 테스트 완료

---

## 📞 문의

구현 중 문제가 발생하면:
1. Flutter 콘솔 로그 확인
2. Firebase Console > Cloud Messaging > 로그 확인
3. Supabase Dashboard > Logs 확인
4. `notification_events` 테이블에서 에러 메시지 확인

