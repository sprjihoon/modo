-- =====================================================
-- 수선 카테고리에 대카테고리(상위 카테고리) 계층 추가
-- repair_categories 테이블에 parent_category_id 컬럼 추가
-- parent_category_id IS NULL  → 대카테고리 (상의, 하의, 공통사항...)
-- parent_category_id NOT NULL → 소카테고리 (기존 카테고리, 대카테고리 하위)
-- =====================================================

-- 1. parent_category_id 컬럼 추가 (자기참조)
ALTER TABLE public.repair_categories
  ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES public.repair_categories(id) ON DELETE SET NULL;

-- 2. 인덱스 추가 (부모 기준 조회 성능)
CREATE INDEX IF NOT EXISTS idx_repair_categories_parent_id
  ON public.repair_categories(parent_category_id);

-- 3. 기존 카테고리는 모두 소카테고리로 유지 (parent_category_id = NULL → 대카테고리로도 동작)
--    기존 데이터 호환성: parent_category_id가 NULL이면 기존처럼 flat 카테고리로 동작

-- 4. 기본 대카테고리 예시 (필요 시 수동 실행, 현재는 주석 처리)
-- INSERT INTO public.repair_categories (name, display_order, is_active)
-- VALUES ('상의', 1, true), ('하의', 2, true), ('공통사항', 99, true)
-- ON CONFLICT (name) DO NOTHING;
