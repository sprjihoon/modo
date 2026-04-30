-- =====================================================
-- 카테고리 계층 구조 설정
-- 기존 카테고리(아우터, 티셔츠 등)를 소카테고리로 변환하고
-- 대카테고리(상의, 하의, 원피스, 부속품)를 신규 생성
-- =====================================================

-- 1. 대카테고리 삽입
--    icon_name은 웹/앱에서 사용 중인 파일명 기준
INSERT INTO public.repair_categories (name, display_order, icon_name, is_active)
VALUES
  ('상의',     1, 'shirt',   true),
  ('하의',     2, 'pants',   true),
  ('원피스',   3, 'dress',   true),
  ('부속품',   4, 'repair_top', true)
ON CONFLICT (name) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  icon_name     = EXCLUDED.icon_name,
  is_active     = EXCLUDED.is_active;

-- 2. 소카테고리 → 대카테고리 연결 (parent_category_id 설정)

-- 상의: 아우터, 티셔츠, 셔츠/맨투맨
UPDATE public.repair_categories
SET parent_category_id = (SELECT id FROM public.repair_categories WHERE name = '상의')
WHERE name IN ('아우터', '티셔츠', '셔츠/맨투맨');

-- 하의: 바지, 청바지, 치마
UPDATE public.repair_categories
SET parent_category_id = (SELECT id FROM public.repair_categories WHERE name = '하의')
WHERE name IN ('바지', '청바지', '치마');

-- 원피스
UPDATE public.repair_categories
SET parent_category_id = (SELECT id FROM public.repair_categories WHERE name = '원피스')
WHERE name IN ('원피스');

-- 부속품: 부속품 수선 (상의), 부속품 수선 (하의)
UPDATE public.repair_categories
SET parent_category_id = (SELECT id FROM public.repair_categories WHERE name = '부속품')
WHERE name IN ('부속품 수선 (상의)', '부속품 수선 (하의)');

-- 3. 결과 확인 쿼리 (실행 후 검토용)
-- SELECT
--   p.name AS 대카테고리,
--   c.name AS 소카테고리,
--   c.display_order
-- FROM public.repair_categories c
-- LEFT JOIN public.repair_categories p ON p.id = c.parent_category_id
-- ORDER BY p.display_order NULLS LAST, c.display_order;
