-- ============================================
-- users 테이블 RLS 무한 재귀 문제 수정
-- ============================================
-- 문제: "Admins can view all users" 정책이 users 테이블을 참조하여 무한 재귀 발생
-- 해결: SECURITY DEFINER 함수를 사용하여 RLS를 우회하는 역할 확인 함수 생성
-- 실행: Supabase SQL Editor에서 실행
-- ============================================

BEGIN;

-- 1. 기존 문제가 있는 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Managers can update workers" ON public.users;

-- 2. SECURITY DEFINER 함수 생성 (RLS를 우회하여 역할 확인)
-- 이 함수는 RLS 정책 내에서 호출되어도 무한 재귀가 발생하지 않음
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 함수에 대한 주석
COMMENT ON FUNCTION public.get_current_user_role() IS 
'현재 인증된 사용자의 역할을 반환합니다. SECURITY DEFINER로 RLS를 우회하여 무한 재귀를 방지합니다.';

-- 3. 새로운 RLS 정책 생성 (무한 재귀 없음)

-- 🔒 정책: 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- 🔒 정책: 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- 🔒 정책: 사용자는 자신의 프로필을 생성 가능 (회원가입 시)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- 🔑 정책: 관리자는 모든 사용자 프로필 조회 가능 (SECURITY DEFINER 함수 사용)
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (public.get_current_user_role() = 'ADMIN');

-- 🔑 정책: 관리자는 모든 사용자 프로필 수정 가능
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (public.get_current_user_role() = 'ADMIN');

-- 🔑 정책: 매니저는 모든 사용자 조회 가능
CREATE POLICY "Managers can view all users"
  ON public.users
  FOR SELECT
  USING (public.get_current_user_role() = 'MANAGER');

-- 🔑 정책: 매니저는 WORKER만 수정 가능
CREATE POLICY "Managers can update workers"
  ON public.users
  FOR UPDATE
  USING (
    public.get_current_user_role() = 'MANAGER'
    AND role::text = 'WORKER'
  );

COMMIT;

-- 4. 확인 메시지
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ users 테이블 RLS 무한 재귀 문제 수정 완료';
  RAISE NOTICE '';
  RAISE NOTICE '변경 사항:';
  RAISE NOTICE '  1. SECURITY DEFINER 함수 생성: get_current_user_role()';
  RAISE NOTICE '  2. 기존 무한 재귀 정책 삭제';
  RAISE NOTICE '  3. 새로운 안전한 RLS 정책 생성';
  RAISE NOTICE '';
  RAISE NOTICE '이제 관리자 로그인이 정상 작동해야 합니다!';
  RAISE NOTICE '';
END $$;

