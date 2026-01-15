-- ============================================
-- 사용자 역할(role) 추가 마이그레이션 (안전 버전)
-- ============================================
-- 실행 방법: 전체 복사 → Supabase SQL Editor에 붙여넣기 → RUN
-- ============================================

BEGIN;

-- 1. 역할(role) ENUM 타입 생성
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'WORKER');
    RAISE NOTICE '✅ ENUM 타입 생성: user_role';
  ELSE
    RAISE NOTICE '⏭️  user_role ENUM이 이미 존재합니다';
  END IF;
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'WORKER';
    RAISE NOTICE '✅ role 컬럼 추가 완료 (기본값: WORKER)';
  ELSE
    RAISE NOTICE '⏭️  role 컬럼이 이미 존재합니다';
  END IF;
END $$;

-- 4. role 컬럼 인덱스 생성 (역할별 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 5. 기존 관리자 계정에 ADMIN 역할 부여
UPDATE public.users 
SET role = 'ADMIN'
WHERE email LIKE '%@admin.modorepair.com';

-- 6. RLS 정책 수정: 역할 기반 접근 제어
-- 기존 관리자 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Managers can update workers" ON public.users;

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

-- 8. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ 사용자 역할(role) 마이그레이션 완료!';
  RAISE NOTICE '====================================';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  ✓ ENUM 타입: user_role (ADMIN, MANAGER, WORKER)';
  RAISE NOTICE '  ✓ auth_id UNIQUE 제약조건';
  RAISE NOTICE '  ✓ role 컬럼 추가 (기본값: WORKER)';
  RAISE NOTICE '  ✓ RLS 정책 업데이트';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '  1. Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '  2. Add User 버튼 클릭';
  RAISE NOTICE '  3. 이메일, 비밀번호 입력 (Auto Confirm ✅)';
  RAISE NOTICE '  4. SETUP_ADMIN_SIMPLE.sql 실행';
  RAISE NOTICE '====================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- 확인: 현재 role 컬럼 상태
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'role';

