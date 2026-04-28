-- ============================================
-- OAuth 유저를 위한 phone 컬럼 nullable 허용
-- ============================================
-- 배경: 카카오/구글/애플 등 소셜 로그인 유저는 전화번호를 제공하지 않음
--       phone NOT NULL 제약으로 public.users 삽입 실패 → 고객 목록 미노출
-- 적용: Supabase SQL Editor에서 실행

-- 1. phone NOT NULL 제약 제거 (null 허용)
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- 2. 기존 빈 문자열('')을 null로 정리 (UNIQUE 충돌 방지)
UPDATE public.users SET phone = NULL WHERE phone = '';

-- 3. on_auth_user_created 트리거도 phone null로 수정
CREATE OR REPLACE FUNCTION auto_create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name  TEXT;
BEGIN
  v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'oauth_' || NEW.id || '@noemail.local');
  v_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    '고객'
  );

  INSERT INTO public.users (auth_id, email, name, phone, role)
  VALUES (NEW.id, v_email, v_name, NULL, 'CUSTOMER')
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_profile();

DO $$ BEGIN
  RAISE NOTICE '✅ phone nullable 허용 완료';
  RAISE NOTICE '✅ on_auth_user_created 트리거 수정 완료 (phone = NULL)';
END $$;
