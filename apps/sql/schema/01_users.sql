-- ============================================
-- 모두의수선 - 사용자 테이블
-- ============================================

-- 고객 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supabase Auth 연동
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- 주소 정보
  default_address TEXT,
  default_address_detail TEXT,
  default_zipcode TEXT,
  
  -- 푸시 알림
  fcm_token TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 인덱스
  CONSTRAINT users_phone_key UNIQUE (phone)
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 정보만 조회/수정 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- 정책: 관리자는 모든 사용자 정보 조회 가능
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.users IS '고객 프로필 정보';
COMMENT ON COLUMN public.users.auth_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN public.users.fcm_token IS 'Firebase Cloud Messaging 토큰';

