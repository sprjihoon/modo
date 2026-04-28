-- ============================================
-- OAuth 유저 phone nullable + login_provider 컬럼 추가 + 소급 backfill
-- ============================================
-- 적용: Supabase SQL Editor에서 실행

-- 1. phone NOT NULL 제약 제거
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- 2. 기존 빈 문자열 null 정리
UPDATE public.users SET phone = NULL WHERE phone = '';

-- 3. login_provider 컬럼 추가 (email / kakao / google / apple / naver)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS login_provider TEXT NOT NULL DEFAULT 'email';

-- 4. auth.users 기준으로 provider 소급 업데이트
UPDATE public.users u
SET login_provider = COALESCE(au.raw_app_meta_data->>'provider', 'email')
FROM auth.users au
WHERE u.auth_id = au.id;

-- 5. 네이버 이메일 패턴으로 추가 보정 (naver-auth edge function은 'email' provider로 등록됨)
UPDATE public.users
SET login_provider = 'naver'
WHERE email LIKE 'naver\_%@naver.com' ESCAPE '\';

-- 6. auth.users에는 있지만 public.users에 없는 유저 소급 생성 (backfill)
INSERT INTO public.users (auth_id, email, name, phone, role, login_provider)
SELECT
  au.id,
  COALESCE(au.email, 'oauth_' || au.id || '@noemail.local'),
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'nickname',
    '고객'
  ),
  NULL,
  'CUSTOMER',
  CASE
    WHEN COALESCE(au.email, '') LIKE 'naver_%@naver.com'
      THEN 'naver'
    ELSE COALESCE(au.raw_app_meta_data->>'provider', 'email')
  END
FROM auth.users au
WHERE au.id NOT IN (SELECT auth_id FROM public.users WHERE auth_id IS NOT NULL)
  AND COALESCE(au.email, '') NOT LIKE '%@admin.modorepair.com'
  AND COALESCE(au.email, '') NOT LIKE '%@manager.modorepair.com';

-- 7. on_auth_user_created 트리거 수정
CREATE OR REPLACE FUNCTION auto_create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_email    TEXT;
  v_name     TEXT;
  v_provider TEXT;
BEGIN
  v_email    := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'oauth_' || NEW.id || '@noemail.local');
  v_name     := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    '고객'
  );
  v_provider := CASE
    WHEN v_email LIKE 'naver_%@naver.com' THEN 'naver'
    ELSE COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  END;

  INSERT INTO public.users (auth_id, email, name, phone, role, login_provider)
  VALUES (NEW.id, v_email, v_name, NULL, 'CUSTOMER', v_provider)
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_profile();

DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '✅ phone nullable, login_provider 추가, backfill 완료';
  RAISE NOTICE '📊 provider별 고객 수:';
  FOR r IN
    SELECT login_provider, COUNT(*) AS cnt
    FROM public.users WHERE role = 'CUSTOMER'
    GROUP BY login_provider ORDER BY cnt DESC
  LOOP
    RAISE NOTICE '   - %: %명', r.login_provider, r.cnt;
  END LOOP;
END $$;
