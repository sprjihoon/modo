-- ============================================
-- repair_categories RLS 정책 수정
-- 문제: 관리자 이메일 패턴이 '%@admin.modusrepair.com'으로 되어있어
--       실제 관리자 이메일 'admin@modusrepair.com'이 매칭되지 않음
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can view active repair categories" ON public.repair_categories;
DROP POLICY IF EXISTS "Admins can manage repair categories" ON public.repair_categories;

-- 새 정책: 모든 사용자가 모든 카테고리 조회 가능 (관리자 페이지에서도 비활성 카테고리 관리 필요)
CREATE POLICY "Anyone can view all repair categories"
  ON public.repair_categories
  FOR SELECT
  USING (true);

-- 새 정책: 관리자만 메뉴 관리 가능 (INSERT, UPDATE, DELETE)
-- 이메일 패턴 수정: admin@modusrepair.com 또는 @modusrepair.com 도메인
CREATE POLICY "Admins can manage repair categories"
  ON public.repair_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- repair_types 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Anyone can view active repair types" ON public.repair_types;
DROP POLICY IF EXISTS "Admins can manage repair types" ON public.repair_types;

CREATE POLICY "Anyone can view all repair types"
  ON public.repair_types
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage repair types"
  ON public.repair_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ repair_categories 및 repair_types RLS 정책이 수정되었습니다.';
END $$;

