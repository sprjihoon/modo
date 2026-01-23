# 네이버 로그인 연동 가이드

## 📋 개요

모두의수선 앱에서 네이버 로그인을 사용하기 위한 설정 가이드입니다.
네이버는 Supabase에서 기본 제공하지 않으므로, `flutter_naver_login` 패키지와 Edge Function을 사용하여 구현합니다.

---

## 🚀 1단계: 네이버 개발자 센터 앱 등록

### 1-1. 네이버 개발자 센터 접속

1. https://developers.naver.com 접속
2. 네이버 계정으로 로그인
3. **Application** → **애플리케이션 등록** 클릭

### 1-2. 애플리케이션 정보 입력

| 항목 | 값 |
|------|-----|
| 애플리케이션 이름 | 모두의수선 |
| 사용 API | 네이버 로그인 |
| 로그인 오픈 API 서비스 환경 | iOS, Android 모두 선택 |

### 1-3. 필수 정보 선택 (동의 항목)

아래 항목들을 **필수** 또는 **선택**으로 설정:

| 항목 | 권장 설정 | 설명 |
|------|---------|------|
| 이메일 주소 | **필수** | 사용자 식별에 필요 |
| 이름 | 필수 또는 선택 | 프로필 표시용 |
| 별명 | 선택 | 이름 대체용 |
| 프로필 사진 | 선택 | 프로필 이미지 |
| 휴대전화번호 | 선택 | 연락처 (비즈니스 앱만 가능) |

### 1-4. 서비스 환경 설정

#### iOS 설정

| 항목 | 값 |
|------|-----|
| 다운로드 URL | App Store URL (앱 등록 후) |
| URL Scheme | `modorepairnaver` |
| Bundle ID | `com.example.modoRepair` (실제 Bundle ID로 변경) |

#### Android 설정

| 항목 | 값 |
|------|-----|
| 다운로드 URL | Google Play URL (앱 등록 후) |
| 패키지 이름 | `com.example.modu_repair` (실제 패키지명으로 변경) |

### 1-5. 발급받은 키 확인

애플리케이션 등록 완료 후 다음 정보를 확인:

- **Client ID**: `XXXXXXXXXXXXX`
- **Client Secret**: `XXXXXXXXXXXXX`

---

## 🔧 2단계: Flutter 앱 설정

### 2-1. 환경 변수 설정

`.env` 파일에 네이버 앱 정보 추가:

```env
# 기존 Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# 네이버 로그인 설정
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret
NAVER_CLIENT_NAME=모두의수선
```

### 2-2. Flutter 네이버 SDK 초기화

`main.dart`에서 네이버 SDK 초기화:

```dart
import 'package:flutter_naver_login/flutter_naver_login.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // .env 파일 로드
  await dotenv.load();
  
  // 네이버 SDK 초기화
  await FlutterNaverLogin.initSdk(
    clientId: dotenv.env['NAVER_CLIENT_ID']!,
    clientSecret: dotenv.env['NAVER_CLIENT_SECRET']!,
    clientName: dotenv.env['NAVER_CLIENT_NAME'] ?? '모두의수선',
  );
  
  // Supabase 초기화
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );
  
  runApp(const MyApp());
}
```

### 2-3. iOS 추가 설정

`ios/Runner/Info.plist`에 이미 추가됨:

```xml
<!-- Naver Login OAuth Callback -->
<dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>naver-login-callback</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>modorepairnaver</string>
    </array>
</dict>
```

### 2-4. Android 추가 설정

`android/app/src/main/AndroidManifest.xml`에 이미 추가됨:

```xml
<!-- Naver Login OAuth Callback -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="modorepairnaver" android:host="oauth" />
</intent-filter>
```

---

## 🗄️ 3단계: 데이터베이스 설정

### 3-1. 마이그레이션 실행

Supabase SQL Editor에서 다음 파일 실행:

```
apps/sql/migrations/add_naver_id_to_users.sql
```

이 마이그레이션은:
- `users` 테이블에 `naver_id` 컬럼 추가
- `auth_provider` 컬럼 추가 (로그인 방식 추적)
- 필요한 인덱스 생성

---

## 🚀 4단계: Edge Function 배포

### 4-1. Edge Function 배포

터미널에서 실행:

```bash
cd apps/edge

# 네이버 인증 Edge Function 배포
supabase functions deploy naver-auth --project-ref YOUR_PROJECT_REF
```

### 4-2. 환경 변수 설정 (선택)

Edge Function에서 추가 검증이 필요한 경우:

```bash
supabase secrets set NAVER_CLIENT_ID=your_client_id
supabase secrets set NAVER_CLIENT_SECRET=your_client_secret
```

---

## ✅ 5단계: 테스트

### 5-1. 앱 실행

```bash
cd apps/mobile
flutter pub get
flutter run
```

### 5-2. 로그인 테스트

1. 앱 실행 후 로그인 화면으로 이동
2. "Naver" 버튼 클릭
3. 네이버 로그인 창에서 로그인
4. 동의 화면에서 필수 항목 동의
5. 앱으로 돌아와서 로그인 완료 확인

### 5-3. 로그 확인

```bash
# Edge Function 로그 확인
supabase functions logs naver-auth --project-ref YOUR_PROJECT_REF
```

---

## ⚠️ 주의사항

### 이메일 필수

네이버 로그인에서 **이메일 정보는 필수**입니다. 사용자가 이메일 동의를 하지 않으면 로그인이 실패합니다.

### 앱 심사

네이버 로그인을 프로덕션에서 사용하려면:

1. 네이버 개발자 센터에서 **검수 요청** 필요
2. 검수 승인 전까지 등록된 테스트 계정만 로그인 가능
3. 검수 승인 후 모든 사용자 로그인 가능

### 비즈니스 앱 전환

휴대전화번호 등 추가 정보가 필요한 경우:

1. 네이버 개발자 센터에서 **비즈니스 앱으로 전환** 필요
2. 사업자등록증 등 서류 제출
3. 승인 후 추가 동의 항목 사용 가능

---

## 🔍 문제 해결

### "이메일 정보를 가져올 수 없습니다"

- 네이버 개발자 센터에서 이메일 동의 항목이 **필수**로 설정되었는지 확인
- 사용자에게 이메일 동의를 받았는지 확인

### "네이버 토큰 검증에 실패했습니다"

- 네이버 앱의 Client ID와 Client Secret이 올바른지 확인
- 앱 상태가 "개발 중" 또는 "운영 중"인지 확인

### "이미 등록된 이메일입니다"

- 해당 이메일로 다른 방식(이메일/구글/카카오)으로 가입한 계정이 있음
- 사용자에게 기존 방식으로 로그인하도록 안내

### iOS에서 로그인 창이 안 열림

- URL Scheme이 `modorepairnaver`로 정확히 설정되었는지 확인
- `LSApplicationQueriesSchemes`에 `naversearchapp`과 `naversearchthirdlogin`이 추가되었는지 확인

### Android에서 콜백이 안 됨

- AndroidManifest.xml의 intent-filter가 올바른지 확인
- `android:scheme="modorepairnaver"` 확인

---

## 📚 참고 자료

- [네이버 로그인 개발 가이드](https://developers.naver.com/docs/login/overview/overview.md)
- [flutter_naver_login 패키지](https://pub.dev/packages/flutter_naver_login)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

