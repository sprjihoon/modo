# Apple Sign In 설정 가이드

## 현재 상태
- ✅ iOS/macOS: **네이티브** `sign_in_with_apple` → Supabase `signInWithIdToken` (`1.0.1+20`)
- ✅ iPad: 네이티브 SIWA를 건너뜀 (심사 기기에서 `AuthorizationError 1000`) → `flutter_web_auth_2` **ASWebAuthenticationSession**
- ✅ iPhone: 네이티브 실패 시에만 같은 웹 세션 폴백 — 인앱 브라우저 사용 안 함
- ✅ Android: Supabase OAuth (`signInWithOAuth` + 외부 브라우저)
- ✅ App ID `com.modurepair.app` — Sign In with Apple 활성화
- ✅ Services ID `com.modurepair.web` — 도메인/콜백 설정
- ✅ Key `BRN5U2Y4XV` (`ModoRepair Apple Sign In`) 발급
- ✅ Supabase Auth Apple Provider 활성화 (`Client IDs`에 bundle + Services ID)
- ✅ App Store 프로파일에 `applesignin` entitlement 포함
- ⚠️ 인앱 브라우저 OAuth는 iPad에서 `appleid.apple.com` 빈 화면 → App Store 2.1 거절 원인 (네이티브로 교체)

## Apple Developer 값

| 항목 | 값 |
|------|-----|
| Team ID | `6R7TSV8PV4` |
| Bundle ID | `com.modurepair.app` |
| Services ID | `com.modurepair.web` |
| Key ID | `BRN5U2Y4XV` |
| Domains | `rzrwediccbamxluegnex.supabase.co` |
| Return URL | `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback` |
| Mobile redirect | `modorepair://login-callback` |

로컬 비밀키(커밋 금지): `secrets/AuthKey_BRN5U2Y4XV.p8`, `secrets/apple-signin.json`

## Supabase Auth > Providers > Apple
| 항목 | 값 |
|------|-----|
| Enable Sign in with Apple | ON |
| Client IDs | `com.modurepair.web`, `com.modurepair.app` |
| Secret Key | Services ID 기준 JWT (`.p8`로 생성, 최대 6개월) |

Secret 재발급 예시:

```bash
python3 - <<'PY'
import time, pathlib, jwt
team_id, key_id = '6R7TSV8PV4', 'BRN5U2Y4XV'
client_id = 'com.modurepair.web'
key = pathlib.Path('secrets/AuthKey_BRN5U2Y4XV.p8').read_text()
now = int(time.time())
token = jwt.encode(
    {'iss': team_id, 'iat': now, 'exp': now + 15777000,
     'aud': 'https://appleid.apple.com', 'sub': client_id},
    key, algorithm='ES256', headers={'kid': key_id},
)
print(token)
PY
```

## iOS 앱 설정 (완료)
`Runner.entitlements` / `RunnerRelease.entitlements`에
`com.apple.developer.applesignin = Default` 포함.

## 테스트
1. 실제 iOS 기기에서 Apple 로그인 시도
2. Supabase Dashboard > Authentication > Users 확인
3. 이메일 숨기기 선택 시 relay 이메일이 올 수 있음

## 주의
- App Store 정책: 다른 소셜 로그인 제공 시 Apple Sign In 필수
- `.p8`는 한 번만 다운로드 가능 — `secrets/`에 백업 유지
- Client Secret JWT는 6개월마다 갱신 필요
