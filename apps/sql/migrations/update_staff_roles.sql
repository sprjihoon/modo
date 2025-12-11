-- ============================================
-- 직원 역할 체계 업데이트
-- ============================================
-- SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자)

-- 1. staff 테이블이 없으면 생성 (TEXT 타입 role 사용)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'WORKER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스 생성 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);

-- 3. RLS 활성화
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own profile" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers can view workers" ON public.staff;
DROP POLICY IF EXISTS "Allow all for service role" ON public.staff;

-- 5. Service role은 모든 작업 가능 정책
CREATE POLICY "Allow all for service role"
  ON public.staff
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. 코멘트 업데이트
COMMENT ON TABLE public.staff IS '직원 계정 정보 (최고관리자, 관리자, 입출고관리자, 작업자) - users 테이블과 분리';
COMMENT ON COLUMN public.staff.role IS '직원 역할: SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자) - TEXT 타입 사용';

-- 7. updated_at 자동 업데이트 트리거 (없으면 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
