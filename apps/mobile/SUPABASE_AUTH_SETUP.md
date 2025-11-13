# Supabase 인증 연동 완료 가이드

## ✅ 완료된 기능

### 1. 기본 인증
- ✅ 이메일/비밀번호 로그인
- ✅ 회원가입 (이메일, 비밀번호, 이름, 전화번호)
- ✅ 이메일/전화번호 중복 체크
- ✅ 비밀번호 재설정 (이메일 발송)
- ✅ 로그아웃
- ✅ 세션 관리 (자동 로그인)

### 2. 소셜 로그인
- ✅ Google 로그인 (기본 제공)
- ⚠️ Naver 로그인 (커스텀 OAuth 설정 필요)
- ⚠️ Kakao 로그인 (커스텀 OAuth 설정 필요)

---

## 🔧 Supabase 설정 필요 사항

### 1. 환경 변수 설정
`.env` 파일에 다음 정보가 필요합니다:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. 데이터베이스 스키마
`users` 테이블이 필요합니다:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. 이메일 인증 설정 (중요!)

#### 3-1. 이메일 확인 활성화/비활성화

**개발 환경 (이메일 확인 OFF - 권장):**
1. Supabase Dashboard 접속
2. **Authentication** → **Providers** 메뉴
3. **Email** 섹션 찾기
4. **"Enable email confirmations"** 토글을 **OFF**로 설정
   - 이렇게 하면 회원가입 시 이메일 확인 없이 바로 로그인 가능
   - 개발/테스트 단계에서 편리함

**프로덕션 환경 (이메일 확인 ON):**
1. **"Enable email confirmations"** 토글을 **ON**으로 설정
2. 사용자가 회원가입 시 이메일 확인 링크를 받아야 로그인 가능
3. 보안상 더 안전함

#### 3-2. 이메일 템플릿 설정

1. **Authentication** → **Email Templates** 메뉴
2. 다음 템플릿들을 커스터마이징 가능:
   - **Confirm signup**: 회원가입 확인 이메일
   - **Magic Link**: 매직 링크 로그인 이메일
   - **Change Email Address**: 이메일 변경 확인
   - **Reset Password**: 비밀번호 재설정 이메일

**템플릿 예시:**
```
제목: {{ .ConfirmationURL }}

안녕하세요,
비밀번호를 재설정하려면 아래 링크를 클릭하세요:

{{ .ConfirmationURL }}

이 링크는 24시간 동안 유효합니다.
```

#### 3-3. SMTP 설정 (선택사항 - 프로덕션 권장)

기본적으로 Supabase는 자체 이메일 서비스를 사용하지만, 프로덕션에서는 커스텀 SMTP를 사용하는 것이 좋습니다.

1. **Settings** → **Auth** → **SMTP Settings**
2. **Enable Custom SMTP** 토글 ON
3. 다음 정보 입력:
   - **Host**: SMTP 서버 주소 (예: `smtp.gmail.com`)
   - **Port**: 포트 번호 (예: `587`)
   - **User**: SMTP 사용자명
   - **Pass**: SMTP 비밀번호
   - **Sender email**: 발신자 이메일 주소
   - **Sender name**: 발신자 이름

**Gmail SMTP 예시:**
```
Host: smtp.gmail.com
Port: 587
User: your-email@gmail.com
Pass: 앱 비밀번호 (Google 계정 설정에서 생성)
Sender email: your-email@gmail.com
Sender name: 의식주컴퍼니
```

#### 3-4. 리다이렉트 URL 설정

비밀번호 재설정이나 이메일 확인 후 리다이렉트될 URL을 설정합니다.

1. **Authentication** → **URL Configuration**
2. **Site URL**: `http://localhost:3000` (개발) 또는 실제 도메인 (프로덕션)
3. **Redirect URLs**: 추가 리다이렉트 URL 입력
   - 예: `http://localhost:3000/auth/callback`
   - 예: `io.flutter.app://` (모바일 앱용)

#### 3-5. 이메일 확인이 필요한 경우 수동 확인 방법

SQL Editor에서 직접 이메일을 확인된 상태로 변경:

```sql
-- 특정 사용자의 이메일 확인
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';

-- 모든 사용자의 이메일 확인 (개발용)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

### 4. Google OAuth 설정
1. Supabase Dashboard > Authentication > Providers
2. Google 활성화
3. Google OAuth Client ID 및 Secret 입력
4. Redirect URL 설정: `io.flutter.app://`

### 5. Naver/Kakao OAuth 설정 (선택사항)
Naver와 Kakao는 Supabase에서 기본 제공되지 않으므로 커스텀 OAuth provider로 설정해야 합니다.

**Naver 설정:**
1. Naver Developers에서 OAuth 앱 생성
2. Supabase Dashboard > Authentication > Providers
3. "Add Custom OAuth Provider" 선택
4. Provider 이름: `naver`
5. Client ID 및 Secret 입력
6. Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
7. Token URL: `https://nid.naver.com/oauth2.0/token`
8. User Info URL: `https://openapi.naver.com/v1/nid/me`

**Kakao 설정:**
1. Kakao Developers에서 OAuth 앱 생성
2. Supabase Dashboard > Authentication > Providers
3. "Add Custom OAuth Provider" 선택
4. Provider 이름: `kakao`
5. Client ID 및 Secret 입력
6. Authorization URL: `https://kauth.kakao.com/oauth/authorize`
7. Token URL: `https://kauth.kakao.com/oauth/token`
8. User Info URL: `https://kapi.kakao.com/v2/user/me`

---

## 📱 사용 방법

### 로그인
1. 이메일과 비밀번호 입력
2. "로그인" 버튼 클릭
3. 성공 시 홈 화면으로 이동

### 회원가입
1. 이름, 이메일, 비밀번호, 전화번호 입력
2. 이메일/전화번호 중복 체크 버튼 클릭
3. 이용약관 및 개인정보처리방침 동의
4. "회원가입" 버튼 클릭
5. 성공 시 홈 화면으로 이동

### 비밀번호 재설정
1. "비밀번호를 잊으셨나요?" 클릭
2. 이메일 입력
3. "재설정 링크 보내기" 클릭
4. 이메일에서 링크 확인 후 새 비밀번호 설정

### 소셜 로그인
1. Google/Naver/Kakao 버튼 클릭
2. OAuth 인증 진행
3. 성공 시 홈 화면으로 이동

### 로그아웃
1. 마이페이지 > 로그아웃 클릭
2. 확인 다이얼로그에서 "로그아웃" 클릭
3. 로그인 화면으로 이동

---

## 🔍 테스트 방법

### 1. 로그인 테스트
```dart
// 테스트 계정 생성 후
이메일: test@example.com
비밀번호: test123456
```

### 2. 회원가입 테스트
- 새로운 이메일과 전화번호로 가입
- 중복 체크 기능 확인
- 약관 동의 확인

### 3. 세션 관리 테스트
- 로그인 후 앱 종료
- 앱 재실행 시 자동 로그인 확인

---

## ⚠️ 주의사항

1. **Naver/Kakao OAuth**: 현재는 에러 메시지만 표시됩니다. Supabase Dashboard에서 커스텀 provider 설정 후 사용 가능합니다.

2. **이메일 확인**: Supabase 설정에 따라 이메일 확인이 필요할 수 있습니다. `enable_confirmations` 설정을 확인하세요.

3. **RLS 정책**: `users` 테이블에 적절한 RLS 정책이 설정되어 있어야 합니다.

4. **리다이렉트 URL**: OAuth 리다이렉트 URL이 올바르게 설정되어 있어야 합니다.

---

## 🐛 문제 해결

### "이메일 확인이 필요합니다" 오류
**원인**: Supabase에서 이메일 확인이 활성화되어 있지만 사용자가 이메일을 확인하지 않음

**해결 방법 1 (개발 환경 - 권장):**
1. Supabase Dashboard → Authentication → Providers
2. Email 섹션에서 **"Enable email confirmations"** 토글을 **OFF**로 설정
3. 이제 이메일 확인 없이 바로 로그인 가능

**해결 방법 2 (특정 사용자만 수동 확인):**
```sql
-- SQL Editor에서 실행
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

**해결 방법 3 (프로덕션 - 이메일 확인 유지):**
- 사용자에게 이메일 확인 링크를 클릭하도록 안내
- 이메일이 오지 않는 경우 스팸 폴더 확인
- SMTP 설정이 올바른지 확인

### 로그인 실패
- 이메일/비밀번호 확인
- Supabase 연결 상태 확인
- 환경 변수 확인
- 이메일 확인 필요 여부 확인 (위 참고)

### 회원가입 실패
- 이메일/전화번호 중복 확인
- 비밀번호 길이 확인 (최소 6자)
- `users` 테이블 존재 확인
- 이메일 확인 설정 확인

### 비밀번호 재설정 이메일이 오지 않음
- SMTP 설정 확인 (Settings → Auth → SMTP Settings)
- 이메일 템플릿 확인 (Authentication → Email Templates)
- 스팸 폴더 확인
- 리다이렉트 URL 설정 확인

### 소셜 로그인 실패
- OAuth provider 설정 확인
- 리다이렉트 URL 확인
- Client ID/Secret 확인

---

## 📚 참고 자료

- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Flutter Supabase 문서](https://supabase.com/docs/reference/dart/introduction)
- [OAuth 설정 가이드](https://supabase.com/docs/guides/auth/social-login)

