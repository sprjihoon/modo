-- ============================================
-- 모두의수선 - 수선 메뉴 데이터 일괄 입력
-- ============================================
-- 83가지 수선 종류 입력

-- 1. 카테고리 먼저 입력
INSERT INTO public.repair_categories (name, display_order, icon_name, is_active) VALUES
  ('아우터', 1, 'outer', true),
  ('티셔츠', 2, 'tshirt', true),
  ('셔츠/맨투맨', 3, 'shirt', true),
  ('원피스', 4, 'dress', true),
  ('바지', 5, 'pants', true),
  ('청바지', 6, 'jeans', true),
  ('치마', 7, 'skirt', true),
  ('부속품 찢김/수선 (상의)', 8, 'repair', true),
  ('부속품 찢김/수선 (하의)', 9, 'repair', true)
ON CONFLICT (name) DO NOTHING;

-- 2. 수선 종류 입력

-- 아우터 (11개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '아우터'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('소매기장 줄임', '기본형', 8000, 18000, 1, NULL),
  ('소매기장 줄임', '단추구멍형', 10000, 20000, 2, NULL),
  ('소매기장 줄임', '지퍼형', 10000, 20000, 3, NULL),
  ('전체팔통 줄임', '전체', 15000, 25000, 4, NULL),
  ('전체팔통 줄임', '알통', 12000, 22000, 5, NULL),
  ('전체팔통 줄임', '팔통', 12000, 22000, 6, NULL),
  ('전체팔통 줄임', '소매통', 12000, 22000, 7, NULL),
  ('어깨길이 줄임', '왼쪽 오른쪽', 15000, 30000, 8, '입력값 2개'),
  ('전체품 줄임', '기본형', 15000, 30000, 9, NULL),
  ('전체품 줄임', '집업형', 18000, 35000, 10, NULL),
  ('총기장 줄임', NULL, 10000, 20000, 11, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 티셔츠 (11개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '티셔츠'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('소매기장 줄임', NULL, 6000, 12000, 1, NULL),
  ('전체팔통 줄임', '전체', 12000, 20000, 2, NULL),
  ('전체팔통 줄임', '알통', 10000, 18000, 3, NULL),
  ('전체팔통 줄임', '팔통', 10000, 18000, 4, NULL),
  ('전체팔통 줄임', '소매통', 10000, 18000, 5, NULL),
  ('어깨길이 줄임', '왼쪽 오른쪽', 12000, 25000, 6, '입력값 2개'),
  ('전체품 줄임', '전체', 12000, 25000, 7, NULL),
  ('전체품 줄임', '가슴', 10000, 20000, 8, NULL),
  ('전체품 줄임', '허리', 10000, 20000, 9, NULL),
  ('전체품 줄임', '최하단품', 10000, 20000, 10, NULL),
  ('총기장 줄임', NULL, 8000, 15000, 11, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 셔츠/맨투맨 (11개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '셔츠/맨투맨'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('소매기장 줄임', NULL, 8000, 15000, 1, NULL),
  ('전체팔통 줄임', '전체', 12000, 22000, 2, NULL),
  ('전체팔통 줄임', '알통', 10000, 20000, 3, NULL),
  ('전체팔통 줄임', '팔통', 10000, 20000, 4, NULL),
  ('전체팔통 줄임', '소매통', 10000, 20000, 5, NULL),
  ('어깨길이 줄임', '왼쪽 오른쪽', 12000, 25000, 6, '입력값 2개'),
  ('전체품 줄임', '전체', 12000, 25000, 7, NULL),
  ('전체품 줄임', '가슴', 10000, 22000, 8, NULL),
  ('전체품 줄임', '허리', 10000, 22000, 9, NULL),
  ('전체품 줄임', '최하단품', 10000, 22000, 10, NULL),
  ('총기장 줄임', NULL, 8000, 18000, 11, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 원피스 (10개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '원피스'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('소매기장 줄임', NULL, 8000, 18000, 1, NULL),
  ('전체팔통 줄임', '알통', 12000, 25000, 2, NULL),
  ('전체팔통 줄임', '팔통', 12000, 25000, 3, NULL),
  ('전체팔통 줄임', '소매통', 12000, 25000, 4, NULL),
  ('어깨길이 줄임', '왼쪽 오른쪽', 15000, 30000, 5, '입력값 2개'),
  ('전체품 줄임', '전체', 15000, 30000, 6, NULL),
  ('전체품 줄임', '가슴', 12000, 25000, 7, NULL),
  ('전체품 줄임', '허리', 12000, 25000, 8, NULL),
  ('전체품 줄임', '최하단품', 12000, 25000, 9, NULL),
  ('총기장 줄임', NULL, 10000, 20000, 10, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 바지 (17개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '바지'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('허리/힙 줄임', '허리+힙', 12000, 25000, 1, '입력값 2개'),
  ('허리/힙 줄임', '허리', 10000, 20000, 2, NULL),
  ('허리/힙 줄임', '힙', 10000, 20000, 3, NULL),
  ('전체통 줄임', '전체', 15000, 30000, 4, NULL),
  ('전체통 줄임', '허벅지', 12000, 25000, 5, NULL),
  ('전체통 줄임', '종아리', 12000, 25000, 6, NULL),
  ('전체통 줄임', '발목', 10000, 20000, 7, NULL),
  ('전체통 줄임', '밑통만', 10000, 20000, 8, NULL),
  ('밑위(가링이) 줄임', NULL, 12000, 25000, 9, NULL),
  ('기장 줄임', '기본형', 6000, 12000, 10, NULL),
  ('기장 줄임', '지퍼형', 8000, 15000, 11, NULL),
  ('기장 줄임', '통넓음', 8000, 15000, 12, NULL),
  ('기장 줄임', '고무줄형', 8000, 15000, 13, NULL),
  ('기장 줄임', '트임형', 8000, 15000, 14, NULL),
  ('기장 줄임', '카브라형', 10000, 18000, 15, NULL),
  ('기장 줄임', '스트립형', 10000, 18000, 16, NULL),
  ('기장+밑통 줄임', NULL, 12000, 22000, 17, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 청바지 (17개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '청바지'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('허리/힙 줄임', '허리+힙', 15000, 30000, 1, '입력값 2개'),
  ('허리/힙 줄임', '허리', 12000, 25000, 2, NULL),
  ('허리/힙 줄임', '힙', 12000, 25000, 3, NULL),
  ('전체통 줄임', '전체', 18000, 35000, 4, NULL),
  ('전체통 줄임', '허벅지', 15000, 30000, 5, NULL),
  ('전체통 줄임', '종아리', 15000, 30000, 6, NULL),
  ('전체통 줄임', '발목', 12000, 25000, 7, NULL),
  ('전체통 줄임', '밑통만', 12000, 25000, 8, NULL),
  ('밑위(가링이) 줄임', NULL, 15000, 30000, 9, NULL),
  ('기장 줄임', '기본형', 8000, 15000, 10, NULL),
  ('기장 줄임', '지퍼형', 10000, 18000, 11, NULL),
  ('기장 줄임', '통넓음', 10000, 18000, 12, NULL),
  ('기장 줄임', '고무줄형', 10000, 18000, 13, NULL),
  ('기장 줄임', '트임형', 10000, 18000, 14, NULL),
  ('기장 줄임', '카브라형', 12000, 22000, 15, NULL),
  ('기장 줄임', '스트립형', 12000, 22000, 16, NULL),
  ('기장+밑통 줄임', NULL, 15000, 28000, 17, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 치마 (6개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '치마'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('허리/힙 줄임', '허리+힙', 12000, 25000, 1, '입력값 2개'),
  ('허리/힙 줄임', '허리', 10000, 20000, 2, NULL),
  ('허리/힙 줄임', '힙', 10000, 20000, 3, NULL),
  ('전체통 줄임', NULL, 15000, 28000, 4, NULL),
  ('기장 줄임', '기본형', 8000, 15000, 5, NULL),
  ('기장 줄임', '통넓음', 10000, 18000, 6, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 부속품 찢김/수선 - 상의 (9개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '부속품 찢김/수선 (상의)'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('누빔수선', NULL, 5000, 15000, 1, NULL),
  ('재박음질', NULL, 5000, 15000, 2, NULL),
  ('단추 달음', NULL, 2000, 5000, 3, NULL),
  ('스냅 달음', NULL, 2000, 5000, 4, NULL),
  ('겉고리 달음', NULL, 3000, 8000, 5, NULL),
  ('고무줄 교체', NULL, 5000, 12000, 6, NULL),
  ('주머니 막음', NULL, 8000, 15000, 7, NULL),
  ('지퍼교체', NULL, 10000, 25000, 8, NULL),
  ('어깨패드 수선', NULL, 8000, 18000, 9, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 부속품 찢김/수선 - 하의 (8개)
INSERT INTO public.repair_types (category_id, name, sub_type, price_min, price_max, display_order, description) 
SELECT 
  (SELECT id FROM public.repair_categories WHERE name = '부속품 찢김/수선 (하의)'),
  name, sub_type, price_min, price_max, display_order, description
FROM (VALUES
  ('누빔 수선', NULL, 5000, 15000, 1, NULL),
  ('재박음질', NULL, 5000, 15000, 2, NULL),
  ('단추 달음', NULL, 2000, 5000, 3, NULL),
  ('스냅 달음', NULL, 2000, 5000, 4, NULL),
  ('겉고리 달음', NULL, 3000, 8000, 5, NULL),
  ('고무줄 교체', NULL, 5000, 12000, 6, NULL),
  ('주머니 막음', NULL, 8000, 15000, 7, NULL),
  ('지퍼교체', NULL, 10000, 25000, 8, NULL)
) AS t(name, sub_type, price_min, price_max, display_order, description)
ON CONFLICT (category_id, name, sub_type) DO NOTHING;

-- 통계 조회
SELECT 
  c.name as 카테고리,
  COUNT(rt.id) as 수선항목수
FROM public.repair_categories c
LEFT JOIN public.repair_types rt ON rt.category_id = c.id
GROUP BY c.name, c.display_order
ORDER BY c.display_order;


