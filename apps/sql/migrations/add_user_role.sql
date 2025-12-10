-- ============================================
-- 사용자 역할(role) 추가 마이그레이션
-- ============================================

-- 1. 역할(role) ENUM 타입 생성
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'WORKER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. auth_id에 UNIQUE 제약조건 추가 (없는 경우)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_auth_id_key' 
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);
    RAISE NOTICE '✅ auth_id에 UNIQUE 제약조건 추가 완료';
  ELSE
    RAISE NOTICE '⏭️  auth_id UNIQUE 제약조건이 이미 존재합니다';
  END IF;
END $$;

-- 3. users 테이블에 role 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'WORKER';

-- 4. role 컬럼 인덱스 생성 (역할별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 5. 기존 관리자 계정에 ADMIN 역할 부여
-- (@admin.modusrepair.com 이메일 도메인을 가진 사용자)
UPDATE public.users 
SET role = 'ADMIN'
WHERE email LIKE '%@admin.modusrepair.com';

-- 6. RLS 정책 수정: 역할 기반 접근 제어
-- 기존 관리자 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- 새로운 역할 기반 정책 생성
-- ADMIN: 모든 사용자 조회/수정 가능
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- MANAGER: 모든 사용자 조회 가능, WORKER만 수정 가능
CREATE POLICY "Managers can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'MANAGER'
    )
  );

CREATE POLICY "Managers can update workers"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u1
      WHERE u1.auth_id = auth.uid()
      AND u1.role = 'MANAGER'
    )
    AND role = 'WORKER'
  );

-- 7. 주석 추가
COMMENT ON COLUMN public.users.role IS '사용자 역할: ADMIN(관리자), MANAGER(입출고 관리자), WORKER(작업자)';

-- 8. 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ 사용자 역할(role) 마이그레이션 완료';
  RAISE NOTICE '   - ENUM 타입 생성: user_role (ADMIN, MANAGER, WORKER)';
  RAISE NOTICE '   - auth_id에 UNIQUE 제약조건 추가';
  RAISE NOTICE '   - users 테이블에 role 컬럼 추가 (기본값: WORKER)';
  RAISE NOTICE '   - RLS 정책 업데이트: 역할 기반 접근 제어';
  RAISE NOTICE '';
END $$;

