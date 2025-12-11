-- ============================================
-- 고객(users)과 직원(staff) 분리 마이그레이션
-- ============================================
-- 목적: 고객과 직원을 별도 테이블로 분리하여 관리
-- 실행 순서: 18_staff.sql 이후 실행
-- ============================================

BEGIN;

-- ============================================
-- 1. staff 테이블에 기존 직원 데이터 이관
-- ============================================

-- 직원 역할 ENUM 생성 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('ADMIN', 'MANAGER', 'WORKER');
    RAISE NOTICE '✅ ENUM 타입 생성: staff_role';
  ELSE
    RAISE NOTICE '⏭️  staff_role ENUM이 이미 존재합니다';
  END IF;
END $$;

-- staff 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role staff_role NOT NULL DEFAULT 'WORKER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_auth_id_key UNIQUE (auth_id)
);

-- RLS 활성화
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 기존 users 테이블에서 직원(ADMIN, MANAGER, WORKER) 데이터를 staff 테이블로 복사
-- (role 컬럼이 있고 CUSTOMER가 아닌 경우)
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  -- users 테이블에 role 컬럼이 있는지 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'role'
  ) THEN
    -- 직원 데이터 이관 (이미 존재하지 않는 경우만)
    INSERT INTO public.staff (auth_id, email, name, phone, role, created_at, updated_at)
    SELECT 
      u.auth_id,
      u.email,
      u.name,
      u.phone,
      CASE 
        WHEN u.role::text = 'ADMIN' THEN 'ADMIN'::staff_role
        WHEN u.role::text = 'MANAGER' THEN 'MANAGER'::staff_role
        WHEN u.role::text = 'WORKER' THEN 'WORKER'::staff_role
      END,
      u.created_at,
      u.updated_at
    FROM public.users u
    WHERE u.role::text IN ('ADMIN', 'MANAGER', 'WORKER')
      AND NOT EXISTS (
        SELECT 1 FROM public.staff s WHERE s.email = u.email
      );
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ % 명의 직원 데이터를 staff 테이블로 이관했습니다', migrated_count;
  ELSE
    RAISE NOTICE '⚠️  users 테이블에 role 컬럼이 없습니다. 수동으로 직원을 추가해주세요.';
  END IF;
END $$;

-- ============================================
-- 2. work_items 테이블의 worker_id 참조 변경
-- ============================================

-- 기존 FK 제약조건 삭제
ALTER TABLE public.work_items 
DROP CONSTRAINT IF EXISTS work_items_worker_id_fkey;

-- 새 FK 제약조건 추가 (staff 테이블 참조)
DO $$
BEGIN
  -- 기존 worker_id 값들을 staff 테이블의 id로 매핑
  -- (users.id → staff.id 매핑이 필요한 경우)
  UPDATE public.work_items wi
  SET worker_id = s.id
  FROM public.users u
  JOIN public.staff s ON s.email = u.email
  WHERE wi.worker_id = u.id;
  
  RAISE NOTICE '✅ work_items.worker_id 데이터 매핑 완료';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  worker_id 매핑 중 오류 발생 (무시해도 됨): %', SQLERRM;
END $$;

-- staff 테이블을 참조하는 새 FK 추가
ALTER TABLE public.work_items 
ADD CONSTRAINT work_items_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES public.staff(id) ON DELETE SET NULL;

-- ============================================
-- 3. staff 테이블 RLS 정책 설정
-- ============================================

-- 기존 정책 삭제 (중복 방지)
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own profile" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Managers can view workers" ON public.staff;

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

-- 정책: ADMIN은 모든 직원 정보 관리 가능
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

-- ============================================
-- 4. 인덱스 및 트리거 설정
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_auth_id ON public.staff(auth_id);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON public.staff(is_active);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 코멘트 추가
-- ============================================

COMMENT ON TABLE public.staff IS '직원 계정 정보 (관리자, 매니저, 작업자) - 고객(users)과 분리';
COMMENT ON COLUMN public.staff.auth_id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN public.staff.role IS '직원 역할: ADMIN(관리자), MANAGER(매니저), WORKER(작업자)';
COMMENT ON COLUMN public.staff.is_active IS '계정 활성화 상태';

COMMIT;

-- ============================================
-- 마이그레이션 결과 확인
-- ============================================
DO $$
DECLARE
  staff_count INTEGER;
  admin_count INTEGER;
  manager_count INTEGER;
  worker_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO staff_count FROM public.staff;
  SELECT COUNT(*) INTO admin_count FROM public.staff WHERE role = 'ADMIN';
  SELECT COUNT(*) INTO manager_count FROM public.staff WHERE role = 'MANAGER';
  SELECT COUNT(*) INTO worker_count FROM public.staff WHERE role = 'WORKER';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ 고객/직원 분리 마이그레이션 완료';
  RAISE NOTICE '   - 총 직원 수: % 명', staff_count;
  RAISE NOTICE '   - ADMIN: % 명', admin_count;
  RAISE NOTICE '   - MANAGER: % 명', manager_count;
  RAISE NOTICE '   - WORKER: % 명', worker_count;
  RAISE NOTICE '';
  RAISE NOTICE '📌 참고: users 테이블은 이제 고객(CUSTOMER) 전용입니다';
  RAISE NOTICE '📌 참고: staff 테이블은 직원(ADMIN, MANAGER, WORKER) 전용입니다';
  RAISE NOTICE '';
END $$;

