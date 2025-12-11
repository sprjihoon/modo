-- ============================================
-- 직원 역할 체계 업데이트
-- ============================================
-- SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자)

-- 1. SUPER_ADMIN 역할 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'SUPER_ADMIN' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'staff_role')
  ) THEN
    ALTER TYPE staff_role ADD VALUE 'SUPER_ADMIN' BEFORE 'ADMIN';
    RAISE NOTICE '✅ staff_role에 SUPER_ADMIN 추가 완료';
  ELSE
    RAISE NOTICE '⚠️ SUPER_ADMIN은 이미 존재함';
  END IF;
END $$;

-- 2. staff 테이블이 없으면 생성
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

-- 3. 인덱스 생성 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);

-- 4. RLS 활성화
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 5. 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own profile" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers can view workers" ON public.staff;
DROP POLICY IF EXISTS "Allow all for service role" ON public.staff;

-- 6. Service role은 모든 작업 가능 정책
CREATE POLICY "Allow all for service role"
  ON public.staff
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. 코멘트 업데이트
COMMENT ON TABLE public.staff IS '직원 계정 정보 (최고관리자, 관리자, 입출고관리자, 작업자) - users 테이블과 분리';
COMMENT ON COLUMN public.staff.role IS '직원 역할: SUPER_ADMIN(최고관리자), ADMIN(관리자), MANAGER(입출고관리자), WORKER(작업자)';

