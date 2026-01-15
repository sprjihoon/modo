# 슈퍼관리자 계정 생성 가이드

## 방법 1: Supabase Dashboard에서 생성 (추천)

### Step 1: Supabase Dashboard 접속
1. https://supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Users** 클릭

### Step 2: 관리자 계정 생성
1. 우측 상단 **Add User** 버튼 클릭
2. 입력:
   - **Email**: `admin@modorepair.com` (또는 원하는 이메일)
   - **Password**: `강력한비밀번호입력` (최소 6자)
   - **Auto Confirm User**: ✅ 체크 (이메일 확인 없이 즉시 활성화)
3. **Create User** 클릭

### Step 3: users 테이블에 프로필 생성 및 ADMIN 역할 부여
1. 좌측 메뉴에서 **SQL Editor** 클릭
2. 아래 SQL 실행:

```sql
-- 방금 생성한 계정의 auth_id 확인
SELECT id, email FROM auth.users WHERE email = 'admin@modorepair.com';

-- 결과에서 나온 id를 복사하여 아래 YOUR_AUTH_ID에 붙여넣기
DO $$
DECLARE
  v_auth_id UUID := 'YOUR_AUTH_ID';  -- 위에서 복사한 auth id
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = v_auth_id) THEN
    -- 이미 존재하면 ADMIN 역할로 업데이트
    UPDATE public.users 
    SET role = 'ADMIN', updated_at = NOW()
    WHERE auth_id = v_auth_id;
    RAISE NOTICE '✅ 기존 계정을 ADMIN으로 업데이트했습니다.';
  ELSE
    -- 없으면 새로 생성
    INSERT INTO public.users (auth_id, email, name, phone, role)
    VALUES (v_auth_id, 'admin@modorepair.com', '최고관리자', '010-0000-0000', 'ADMIN');
    RAISE NOTICE '✅ 새로운 ADMIN 계정을 생성했습니다.';
  END IF;
END $$;
```

### Step 4: 로그인 테스트
- 관리자 페이지: http://localhost:3000/login
- 이메일: `admin@modorepair.com`
- 비밀번호: 위에서 설정한 비밀번호

---

## 방법 2: SQL 스크립트로 자동 생성

Supabase SQL Editor에서 아래 전체 스크립트 실행:

```sql
-- ============================================
-- 슈퍼관리자 계정 생성 스크립트
-- ============================================

DO $$
DECLARE
  admin_auth_id UUID;
  admin_email TEXT := 'admin@modorepair.com';
  admin_password TEXT := 'AdminPassword123!';  -- 강력한 비밀번호로 변경하세요!
BEGIN
  -- 1. 이미 존재하는 계정 확인
  SELECT id INTO admin_auth_id 
  FROM auth.users 
  WHERE email = admin_email;

  IF admin_auth_id IS NULL THEN
    RAISE NOTICE '⏳ 슈퍼관리자 계정이 없습니다. 생성 중...';
    
    -- 주의: auth.users 테이블에 직접 삽입은 Supabase에서 권장하지 않습니다.
    -- 대신 Supabase Dashboard의 Authentication > Users에서 생성하세요.
    
    RAISE NOTICE '❌ Supabase Dashboard > Authentication > Users에서 직접 생성해주세요.';
    RAISE NOTICE '   이메일: %', admin_email;
    RAISE NOTICE '   비밀번호: 원하는 강력한 비밀번호';
    RAISE NOTICE '   Auto Confirm User: 체크';
  ELSE
    RAISE NOTICE '✅ 슈퍼관리자 계정이 이미 존재합니다: %', admin_email;
    
    -- 2. users 테이블에 프로필 생성 (role = ADMIN)
    -- 이미 존재하는지 확인
    IF EXISTS (SELECT 1 FROM public.users WHERE auth_id = admin_auth_id) THEN
      -- 이미 존재하면 ADMIN 역할로 업데이트
      UPDATE public.users 
      SET role = 'ADMIN', updated_at = NOW()
      WHERE auth_id = admin_auth_id;
      RAISE NOTICE '✅ 기존 프로필을 ADMIN으로 업데이트했습니다.';
    ELSE
      -- 없으면 새로 생성
      INSERT INTO public.users (
        auth_id,
        email,
        name,
        phone,
        role,
        created_at,
        updated_at
      )
      VALUES (
        admin_auth_id,
        admin_email,
        '최고관리자',
        '010-0000-0000',
        'ADMIN',
        NOW(),
        NOW()
      );
      RAISE NOTICE '✅ users 테이블에 ADMIN 프로필을 생성했습니다.';
    END IF;
  END IF;
END $$;
```

---

## 방법 3: 기존 계정을 ADMIN으로 승격

이미 사용 중인 계정이 있다면:

```sql
-- 특정 이메일 계정을 ADMIN으로 변경
UPDATE public.users 
SET role = 'ADMIN'
WHERE email = 'your.email@example.com';

-- 확인
SELECT email, name, role 
FROM public.users 
WHERE role = 'ADMIN';
```

---

## 보안 팁 🔒

1. **강력한 비밀번호 사용**
   - 최소 12자 이상
   - 대소문자, 숫자, 특수문자 혼합
   - 예: `Admin@Modo2025!Secure`

2. **관리자 이메일 보호**
   - 공개되지 않는 이메일 사용
   - 2FA(Two-Factor Authentication) 활성화 권장

3. **정기적인 비밀번호 변경**
   - 3개월마다 비밀번호 변경
   - 이전 비밀번호 재사용 금지

---

## 문제 해결 (Troubleshooting)

### Q1: "User already exists" 오류
- Supabase Dashboard > Authentication > Users에서 기존 계정 삭제 후 재생성

### Q2: 로그인 후 권한 오류
- SQL Editor에서 확인:
  ```sql
  SELECT u.email, u.role, a.id as auth_id
  FROM public.users u
  JOIN auth.users a ON u.auth_id = a.id
  WHERE u.email = 'admin@modorepair.com';
  ```
- role이 'ADMIN'인지 확인

### Q3: "Email not confirmed" 오류
- Supabase Dashboard > Authentication > Users
- 해당 유저 클릭 → **Confirm Email** 버튼 클릭

---

## 다음 단계

슈퍼관리자 계정 생성 후:
1. ✅ 로그인 테스트
2. ✅ `/dashboard/settings/staff`에서 직원 계정 생성
3. ✅ 각 직원 계정으로 로그인 테스트
4. ✅ 권한별 접근 제어 확인

