-- ============================================
-- users 테이블 RLS 정책 단순화
-- 개발 중 모든 인증 사용자가 조회/생성 가능하도록
-- ============================================

-- users 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  default_address TEXT,
  default_address_detail TEXT,
  default_zipcode TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- 새 정책: 개발 중 간단하게
CREATE POLICY "Anyone authenticated can select users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ users 테이블 RLS 정책이 단순화되었습니다!';
  RAISE NOTICE '📝 모든 인증된 사용자가 users 테이블을 사용할 수 있습니다.';
END $$;

