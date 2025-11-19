-- ============================================
-- 모두의수선 - 수선 메뉴 데이터 일괄 입력 (sub_type 제거 버전)
-- sub_type이 제거되었으므로 세부 타입은 이름에 포함
-- ============================================

-- 1. 카테고리 입력
INSERT INTO public.repair_categories (name, display_order, icon_name, is_active) VALUES
  ('아우터', 1, 'outer', true),
  ('티셔츠', 2, 'tshirt', true),
  ('셔츠/맨투맨', 3, 'shirt', true),
  ('원피스', 4, 'dress', true),
  ('바지', 5, 'pants', true),
  ('청바지', 6, 'jeans', true),
  ('치마', 7, 'skirt', true),
  ('부속품 수선 (상의)', 8, 'repair_top', true),
  ('부속품 수선 (하의)', 9, 'repair_bottom', true)
ON CONFLICT (name) DO UPDATE SET 
  display_order = EXCLUDED.display_order,
  icon_name = EXCLUDED.icon_name;

-- 2. 수선 종류 입력 (세부 타입은 이름에 통합)

-- 아우터 (11개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), * FROM (VALUES
  ('소매기장 줄임 - 기본형', 15000, 1, true),
  ('소매기장 줄임 - 단추구멍형', 18000, 2, true),
  ('소매기장 줄임 - 지퍼형', 18000, 3, true),
  ('전체팔통 줄임 - 전체', 20000, 4, true),
  ('전체팔통 줄임 - 알통', 18000, 5, true),
  ('전체팔통 줄임 - 팔통', 18000, 6, true),
  ('전체팔통 줄임 - 소매통', 18000, 7, true),
  ('어깨길이 줄임', 25000, 8, true),
  ('전체품 줄임 - 기본형', 25000, 9, true),
  ('전체품 줄임 - 집업형', 30000, 10, true),
  ('총기장 줄임', 15000, 11, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 티셔츠 (11개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '티셔츠'), * FROM (VALUES
  ('소매기장 줄임', 10000, 1, true),
  ('전체팔통 줄임 - 전체', 18000, 2, true),
  ('전체팔통 줄임 - 알통', 15000, 3, true),
  ('전체팔통 줄임 - 팔통', 15000, 4, true),
  ('전체팔통 줄임 - 소매통', 15000, 5, true),
  ('어깨길이 줄임', 20000, 6, true),
  ('전체품 줄임 - 전체', 20000, 7, true),
  ('전체품 줄임 - 가슴', 18000, 8, true),
  ('전체품 줄임 - 허리', 18000, 9, true),
  ('전체품 줄임 - 최하단품', 18000, 10, true),
  ('총기장 줄임', 12000, 11, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 셔츠/맨투맨 (11개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '셔츠/맨투맨'), * FROM (VALUES
  ('소매기장 줄임', 12000, 1, true),
  ('전체팔통 줄임 - 전체', 20000, 2, true),
  ('전체팔통 줄임 - 알통', 18000, 3, true),
  ('전체팔통 줄임 - 팔통', 18000, 4, true),
  ('전체팔통 줄임 - 소매통', 18000, 5, true),
  ('어깨길이 줄임', 22000, 6, true),
  ('전체품 줄임 - 전체', 22000, 7, true),
  ('전체품 줄임 - 가슴', 20000, 8, true),
  ('전체품 줄임 - 허리', 20000, 9, true),
  ('전체품 줄임 - 최하단품', 20000, 10, true),
  ('총기장 줄임', 15000, 11, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 원피스 (10개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '원피스'), * FROM (VALUES
  ('소매기장 줄임', 15000, 1, true),
  ('전체팔통 줄임 - 알통', 22000, 2, true),
  ('전체팔통 줄임 - 팔통', 22000, 3, true),
  ('전체팔통 줄임 - 소매통', 22000, 4, true),
  ('어깨길이 줄임', 25000, 5, true),
  ('전체품 줄임 - 전체', 25000, 6, true),
  ('전체품 줄임 - 가슴', 22000, 7, true),
  ('전체품 줄임 - 허리', 22000, 8, true),
  ('전체품 줄임 - 최하단품', 22000, 9, true),
  ('총기장 줄임', 18000, 10, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 바지 (17개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '바지'), * FROM (VALUES
  ('허리/힙 줄임 - 허리+힙', 22000, 1, true),
  ('허리/힙 줄임 - 허리', 18000, 2, true),
  ('허리/힙 줄임 - 힙', 18000, 3, true),
  ('전체통 줄임 - 전체', 25000, 4, true),
  ('전체통 줄임 - 허벅지', 22000, 5, true),
  ('전체통 줄임 - 종아리', 22000, 6, true),
  ('전체통 줄임 - 발목', 18000, 7, true),
  ('전체통 줄임 - 밑통만', 18000, 8, true),
  ('밑위(가링이) 줄임', 22000, 9, true),
  ('기장 줄임 - 기본형', 10000, 10, true),
  ('기장 줄임 - 지퍼형', 12000, 11, true),
  ('기장 줄임 - 통넓음', 12000, 12, true),
  ('기장 줄임 - 고무줄형', 12000, 13, true),
  ('기장 줄임 - 트임형', 12000, 14, true),
  ('기장 줄임 - 카브라형', 15000, 15, true),
  ('기장 줄임 - 스트립형', 15000, 16, true),
  ('기장+밑통 줄임', 20000, 17, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 청바지 (17개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '청바지'), * FROM (VALUES
  ('허리/힙 줄임 - 허리+힙', 25000, 1, true),
  ('허리/힙 줄임 - 허리', 22000, 2, true),
  ('허리/힙 줄임 - 힙', 22000, 3, true),
  ('전체통 줄임 - 전체', 28000, 4, true),
  ('전체통 줄임 - 허벅지', 25000, 5, true),
  ('전체통 줄임 - 종아리', 25000, 6, true),
  ('전체통 줄임 - 발목', 22000, 7, true),
  ('전체통 줄임 - 밑통만', 22000, 8, true),
  ('밑위(가링이) 줄임', 25000, 9, true),
  ('기장 줄임 - 기본형', 12000, 10, true),
  ('기장 줄임 - 지퍼형', 15000, 11, true),
  ('기장 줄임 - 통넓음', 15000, 12, true),
  ('기장 줄임 - 고무줄형', 15000, 13, true),
  ('기장 줄임 - 트임형', 15000, 14, true),
  ('기장 줄임 - 카브라형', 18000, 15, true),
  ('기장 줄임 - 스트립형', 18000, 16, true),
  ('기장+밑통 줄임', 25000, 17, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 치마 (6개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '치마'), * FROM (VALUES
  ('허리/힙 줄임 - 허리+힙', 22000, 1, true),
  ('허리/힙 줄임 - 허리', 18000, 2, true),
  ('허리/힙 줄임 - 힙', 18000, 3, true),
  ('전체통 줄임', 25000, 4, true),
  ('기장 줄임 - 기본형', 12000, 5, true),
  ('기장 줄임 - 통넓음', 15000, 6, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 부속품 수선 - 상의 (9개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '부속품 수선 (상의)'), * FROM (VALUES
  ('누빔수선', 10000, 1, true),
  ('재박음질', 10000, 2, true),
  ('단추 달음', 3000, 3, true),
  ('스냅 달음', 3000, 4, true),
  ('겉고리 달음', 5000, 5, true),
  ('고무줄 교체', 8000, 6, true),
  ('주머니 막음', 12000, 7, true),
  ('지퍼교체', 18000, 8, true),
  ('어깨패드 수선', 15000, 9, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 부속품 수선 - 하의 (8개)
INSERT INTO public.repair_types (category_id, name, price, display_order, is_active) 
SELECT (SELECT id FROM public.repair_categories WHERE name = '부속품 수선 (하의)'), * FROM (VALUES
  ('누빔 수선', 10000, 1, true),
  ('재박음질', 10000, 2, true),
  ('단추 달음', 3000, 3, true),
  ('스냅 달음', 3000, 4, true),
  ('겉고리 달음', 5000, 5, true),
  ('고무줄 교체', 8000, 6, true),
  ('주머니 막음', 12000, 7, true),
  ('지퍼교체', 18000, 8, true)
) AS t(name, price, display_order, is_active)
ON CONFLICT (category_id, name) DO UPDATE SET 
  price = EXCLUDED.price,
  display_order = EXCLUDED.display_order;

-- 어깨길이 줄임 항목에 입력값 2개 설정
UPDATE public.repair_types
SET 
  requires_multiple_inputs = true,
  input_count = 2,
  input_labels = ARRAY['왼쪽 어깨 (cm)', '오른쪽 어깨 (cm)']
WHERE name = '어깨길이 줄임';

-- 통계 조회
SELECT 
  c.name as "카테고리",
  COUNT(rt.id) as "수선 항목 수",
  MIN(rt.price) as "최소 가격",
  MAX(rt.price) as "최대 가격",
  ROUND(AVG(rt.price)) as "평균 가격"
FROM public.repair_categories c
LEFT JOIN public.repair_types rt ON rt.category_id = c.id
GROUP BY c.name, c.display_order
ORDER BY c.display_order;

