-- ============================================
-- 모두의수선 - 사용자 테이블 (간소화 버전)
-- ============================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  default_address TEXT,
  default_address_detail TEXT,
  default_zipcode TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_phone_key UNIQUE (phone)
);

-- 2. RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 트리거 생성
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 6. RLS 정책 생성
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- 관리자 정책: auth.users를 직접 조회하여 RLS 재귀 방지
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

