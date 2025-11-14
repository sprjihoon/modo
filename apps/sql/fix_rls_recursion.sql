-- ============================================
-- RLS 무한 재귀 문제 수정
-- ============================================
-- 문제: "Admins can view all users" 정책이 public.users를 조회하여 무한 재귀 발생
-- 해결: auth.users를 직접 조회하도록 변경 (RLS가 없는 시스템 테이블)

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- "Users can update own profile" 정책도 WITH CHECK 추가를 위해 재생성
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 수정된 정책 생성 (auth.users를 직접 조회하여 RLS 재귀 방지)
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 사용자 자신의 프로필 업데이트 정책 재생성 (WITH CHECK 추가)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

