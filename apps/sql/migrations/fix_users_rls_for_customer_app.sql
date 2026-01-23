-- ============================================
-- users 테이블 RLS 정책 수정
-- 고객 앱에서 본인 정보만 조회 가능하도록
-- ============================================

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (존재하면)
DROP POLICY IF EXISTS "Anyone authenticated can select users" ON public.users;
DROP POLICY IF EXISTS "Anyone authenticated can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone authenticated can update users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- 새 정책: 본인 정보만 조회 가능
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- 새 정책: 본인 정보만 생성 가능
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- 새 정책: 본인 정보만 수정 가능
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ============================================
-- RLS 우회용 함수 생성 (SECURITY DEFINER)
-- 앱에서 auth_id로 user_id를 조회할 때 사용
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.get_user_id_by_auth_id(UUID);

-- RLS 우회하여 user_id 조회하는 함수
CREATE OR REPLACE FUNCTION public.get_user_id_by_auth_id(auth_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM public.users
  WHERE auth_id = auth_user_id;
  
  RETURN user_uuid;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_user_id_by_auth_id(UUID) TO authenticated;

-- ============================================
-- 익명 사용자도 company_info 조회 가능하도록
-- (고객센터 전화번호 등)
-- ============================================

-- company_info RLS 정책
DROP POLICY IF EXISTS "Company info is viewable by everyone" ON public.company_info;
DROP POLICY IF EXISTS "company_info_select_anon" ON public.company_info;
DROP POLICY IF EXISTS "company_info_select_all" ON public.company_info;

-- 모든 사용자가 읽을 수 있도록 (로그인 전에도)
CREATE POLICY "company_info_select_all"
  ON public.company_info
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ BEGIN
  RAISE NOTICE '✅ users 테이블 RLS 정책이 수정되었습니다!';
  RAISE NOTICE '✅ get_user_id_by_auth_id 함수가 생성되었습니다!';
  RAISE NOTICE '📝 본인 정보만 조회/수정 가능합니다.';
END $$;

