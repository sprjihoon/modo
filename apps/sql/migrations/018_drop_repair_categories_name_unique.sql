-- =====================================================
-- repair_categories: name UNIQUE 제약조건 제거
-- 계층 구조(parent_category_id)에서 같은 이름의 카테고리가
-- 서로 다른 부모 아래 존재할 수 있도록 허용합니다.
-- 대신 (name, parent_category_id) 복합 고유 제약으로 교체합니다.
-- =====================================================

-- 1. 기존 name UNIQUE 제약 제거
ALTER TABLE public.repair_categories
  DROP CONSTRAINT IF EXISTS repair_categories_name_key;

-- 2. 같은 부모 아래에서만 이름 중복 방지 (복합 고유)
--    parent_category_id가 NULL인 경우도 구분하기 위해 COALESCE 사용
CREATE UNIQUE INDEX IF NOT EXISTS idx_repair_categories_name_per_parent
  ON public.repair_categories (name, COALESCE(parent_category_id, '00000000-0000-0000-0000-000000000000'::uuid));
