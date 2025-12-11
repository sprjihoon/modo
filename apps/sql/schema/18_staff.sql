-- ============================================
-- 모두의수선 - 직원(Staff) 테이블
-- ============================================
-- 고객(users)과 직원(staff)을 분리하여 관리

-- 직원 역할 ENUM
CREATE TYPE staff_role AS ENUM (
  'ADMIN',    -- 관리자
  'MANAGER',  -- 매니저 (입출고 관리)
  'WORKER'    -- 작업자
);

-- 직원 테이블
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supabase Auth 연동
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  
  -- 역할
  role staff_role NOT NULL DEFAULT 'WORKER',
  
  -- 활성화 상태
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT staff_auth_id_key UNIQUE (auth_id)
);

-- RLS 활성화
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 정책: 직원은 자신의 정보 조회 가능
CREATE POLICY "Staff can view own profile"
  ON public.staff
  FOR SELECT
  USING (auth.uid() = auth_id);

-- 정책: 직원은 자신의 정보 수정 가능
CREATE POLICY "Staff can update own profile"
  ON public.staff
  FOR UPDATE
  USING (auth.uid() = auth_id);

-- 정책: ADMIN은 모든 직원 정보 조회/수정/추가/삭제 가능
CREATE POLICY "Admins can manage all staff"
  ON public.staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE auth_id = auth.uid()
      AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE auth_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- 정책: MANAGER는 WORKER 조회 가능
CREATE POLICY "Managers can view workers"
  ON public.staff
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE auth_id = auth.uid()
      AND role = 'MANAGER'
    )
    AND role = 'WORKER'
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE public.staff IS '직원 계정 정보 (관리자, 매니저, 작업자)';
COMMENT ON COLUMN public.staff.auth_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN public.staff.role IS '직원 역할: ADMIN(관리자), MANAGER(매니저), WORKER(작업자)';
COMMENT ON COLUMN public.staff.is_active IS '계정 활성화 상태';

