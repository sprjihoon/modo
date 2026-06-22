# 도메인 변경 · OAuth 설정 체크리스트

고객 웹 메인 도메인: **https://modo.io.kr**

코드에서는 OAuth 콜백을 `getAuthOrigin()` / `getOAuthCallbackUrl()` / `getNaverCallbackUrl()`로 생성합니다.  
**외부 개발자 콘솔**에 아래 URL을 등록해야 로그인이 동작합니다.

---

## 1. Supabase Dashboard (필수)

**Authentication → URL Configuration**

| 항목 | 값 |
|------|-----|
| Site URL | `https://modo.io.kr` |
| Redirect URLs | 아래 전체 추가 |

```
https://modo.io.kr/**
https://www.modo.io.kr/**
https://modo.mom/**
https://www.modo.mom/**
https://modorepair.com/**
https://www.modorepair.com/**
modorepair://login-callback
modorepair://**
http://localhost:3000/**
http://localhost:3001/**
```

로컬 `apps/edge/supabase/config.toml`과 동일하게 맞추면 됩니다.

**Authentication → Providers**에서 카카오·구글·애플이 Enabled인지 확인.

---

## 2. 네이버 로그인 (웹)

[네이버 개발자 센터](https://developers.naver.com) → 애플리케이션 → **API 설정**

**PC 웹** 서비스 환경:

| 항목 | 값 |
|------|-----|
| 서비스 URL | `https://modo.io.kr` |
| Callback URL | `https://modo.io.kr/auth/naver/callback` |

레거시 도메인으로 접속 시 Vercel에서 `modo.io.kr`로 리다이렉트되므로, Callback은 **modo.io.kr**만 등록하면 됩니다.

모바일 앱은 SDK + `modorepairnaver` URL Scheme (웹 Callback과 별도).

Vercel **modo-web** 환경변수:

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NEXT_PUBLIC_NAVER_CLIENT_ID` (클라이언트용, Client ID와 동일)

---

## 3. 카카오 로그인 (Supabase OAuth)

Supabase가 OAuth 중계를 하므로 **두 곳** 모두 설정합니다.

### 3-1. Supabase Provider (카카오)

**Authentication → Providers → Kakao**

- REST API Key, Client Secret 입력
- Redirect URL (Supabase가 표시):  
  `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback`

### 3-2. 카카오 Developers

[카카오 디벨로퍼스](https://developers.kakao.com) → 앱 → **플랫폼**

| 플랫폼 | 설정 |
|--------|------|
| Web | 사이트 도메인 `https://modo.io.kr` |
| Redirect URI | `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback` |

동의 항목: 이메일(필수 권장), 프로필 등.

---

## 4. Google 로그인

[Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client

| 항목 | 값 |
|------|-----|
| Authorized JavaScript origins | `https://modo.io.kr` |
| Authorized redirect URIs | `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback` |

Supabase **Providers → Google**에 Client ID / Secret 연결.

---

## 5. Apple Sign In

[Apple Developer](https://developer.apple.com) → Identifiers → Services ID

| 항목 | 값 |
|------|-----|
| Domains | `modo.io.kr` |
| Return URLs | `https://rzrwediccbamxluegnex.supabase.co/auth/v1/callback` |

Supabase **Providers → Apple** 설정 (Key, Team ID, Service ID).

---

## 6. Vercel (modo-web)

| 항목 | 값 |
|------|-----|
| Production 도메인 | `modo.io.kr`, `www.modo.io.kr` (+ 레거시 `modo.mom`, `modorepair.com` 유지 시) |
| `NEXT_PUBLIC_APP_URL` | `https://modo.io.kr` |

`next.config.mjs`에서 레거시 호스트 → `modo.io.kr` 301 리다이렉트.

---

## 7. 모바일 (변경 없음)

앱 OAuth는 웹 도메인과 무관한 딥링크를 사용합니다.

| 제공자 | redirect |
|--------|----------|
| Google / 카카오 / 애플 | `modorepair://login-callback` |
| 네이버 | SDK + `modorepairnaver` scheme |
| 비밀번호 재설정 | `https://modo.io.kr/auth/reset-password` |

Supabase Redirect URLs에 `modorepair://**` 포함 필요.

---

## 검증 방법

1. https://modo.io.kr/login 에서 카카오·네이버·구글·애플 각각 로그인
2. 네이버 실패 시: Callback URL 불일치 → 네이버 콘솔 `https://modo.io.kr/auth/naver/callback` 확인
3. 카카오/구글/애플 실패 시: Supabase Redirect URLs 및 각 콘솔의 `...supabase.co/auth/v1/callback` 확인
4. 레거시 URL https://modo.mom/login → `modo.io.kr` 리다이렉트 후 로그인 재시도
