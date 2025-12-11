-- ============================================
-- 모두의수선 - 직원(Staff) 테이블
-- ============================================
-- 고객(users)과 직원(staff)을 분리하여 관리
-- 역할: SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자)

-- 직원 테이블 (TEXT 타입 role 사용 - ENUM 대신)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Supabase Auth 연동
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  
  -- 역할 (TEXT 타입 - 유연한 확장 가능)
  -- 허용값: SUPER_ADMIN, ADMIN, MANAGER, WORKER
  role TEXT NOT NULL DEFAULT 'WORKER',
  
  -- 활성화 상태
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT staff_auth_id_key UNIQUE (auth_id),
  CONSTRAINT staff_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WORKER'))
);

-- RLS 활성화
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 정책: Service Role은 모든 작업 가능
CREATE POLICY "Allow all for service role"
  ON public.staff
  FOR ALL
  USING (true)
  WITH CHECK (true);

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
COMMENT ON TABLE public.staff IS '직원 계정 정보 (최고관리자, 관리자, 입출고관리자, 작업자) - users 테이블과 분리';
COMMENT ON COLUMN public.staff.auth_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN public.staff.role IS '직원 역할: SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자)';
COMMENT ON COLUMN public.staff.is_active IS '계정 활성화 상태';
