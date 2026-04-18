-- ============================================
-- 수선 메뉴 등록 가능한 9가지 케이스 시드 데이터
-- ============================================
-- 두 축의 조합으로 9가지 케이스가 존재:
--   X축: requires_measurement
--     - false (선택만)
--     - true (단일 입력)
--     - true + requires_multiple_inputs (다중 입력)
--   Y축: has_sub_parts
--     - false (단일 항목)
--     - true + allow_multiple_sub_parts=false (단일 부위 선택)
--     - true + allow_multiple_sub_parts=true (다중 부위 선택)
-- ============================================

-- 0. 테스트 카테고리 생성 (기존 데이터를 건드리지 않도록)
INSERT INTO public.repair_categories (name, display_order, icon_name, is_active)
VALUES ('🧪 9케이스 검증', 9999, 'tshirt', true)
ON CONFLICT (name) DO NOTHING;

-- 카테고리 ID 가져오기
DO $$
DECLARE
  cat_id UUID;
  rid UUID;
BEGIN
  SELECT id INTO cat_id FROM public.repair_categories WHERE name = '🧪 9케이스 검증' LIMIT 1;

  -- 깨끗한 상태로 시작: 이전 시드 정리
  DELETE FROM public.repair_types WHERE category_id = cat_id;

  -- ────────────────────────────────────────────
  -- Case 1: 측정 X / 부속 X (단순 선택만 → 즉시 추가)
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[1] 단추 달기 (측정X·부속X)', 3000, 1,
    false, false, 1, ARRAY['치수'],
    false, false, NULL
  );

  -- ────────────────────────────────────────────
  -- Case 2: 측정 X / 부속 단일선택
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[2] 지퍼 교체 (측정X·부속단일)', 18000, 2,
    false, false, 1, ARRAY['치수'],
    true, false, '교체할 지퍼 위치를 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '앞 지퍼', 18000, 1),
    (rid, '옆 지퍼', 20000, 2),
    (rid, '뒤 지퍼', 0, 3);   -- price=0 → 상위 항목 가격(18000) 사용 폴백

  -- ────────────────────────────────────────────
  -- Case 3: 측정 X / 부속 다중선택
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[3] 단추 달기 묶음 (측정X·부속다중)', 3000, 3,
    false, false, 1, ARRAY['치수'],
    true, true, '단추 위치를 모두 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '왼쪽 소매', 3000, 1),
    (rid, '오른쪽 소매', 3000, 2),
    (rid, '앞섶', 5000, 3),
    (rid, '뒤판', 0, 4);  -- price=0 → 폴백

  -- ────────────────────────────────────────────
  -- Case 4: 측정 단일 / 부속 X
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[4] 소매기장 줄임 (측정단일·부속X)', 12000, 4,
    true, false, 1, ARRAY['소매기장 (cm)'],
    false, false, NULL
  );

  -- ────────────────────────────────────────────
  -- Case 5: 측정 단일 / 부속 단일선택
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[5] 단품 줄임 (측정단일·부속단일)', 18000, 5,
    true, false, 1, ARRAY['줄일 길이 (cm)'],
    true, false, '줄일 부위를 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '앞섶', 18000, 1),
    (rid, '뒤판', 20000, 2),
    (rid, '왼팔', 0, 3);  -- 폴백

  -- ────────────────────────────────────────────
  -- Case 6: 측정 단일 / 부속 다중선택
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[6] 다부위 줄임 (측정단일·부속다중)', 15000, 6,
    true, false, 1, ARRAY['줄일 길이 (cm)'],
    true, true, '줄일 부위를 모두 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '왼팔', 15000, 1),
    (rid, '오른팔', 15000, 2),
    (rid, '앞섶', 18000, 3),
    (rid, '뒤판', 0, 4);  -- 폴백

  -- ────────────────────────────────────────────
  -- Case 7: 측정 다중 / 부속 X
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[7] 어깨길이 줄임 (측정다중·부속X)', 22000, 7,
    true, true, 2, ARRAY['왼쪽 어깨 (cm)', '오른쪽 어깨 (cm)'],
    false, false, NULL
  );

  -- ────────────────────────────────────────────
  -- Case 8: 측정 다중 / 부속 단일선택
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[8] 부위별 어깨/팔 (측정다중·부속단일)', 25000, 8,
    true, true, 2, ARRAY['윗단 (cm)', '아랫단 (cm)'],
    true, false, '수선할 부위를 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '왼쪽', 25000, 1),
    (rid, '오른쪽', 25000, 2),
    (rid, '양쪽', 45000, 3);

  -- ────────────────────────────────────────────
  -- Case 9: 측정 다중 / 부속 다중선택 (가장 복잡)
  -- ────────────────────────────────────────────
  INSERT INTO public.repair_types (
    category_id, name, price, display_order,
    requires_measurement, requires_multiple_inputs, input_count, input_labels,
    has_sub_parts, allow_multiple_sub_parts, sub_parts_title
  ) VALUES (
    cat_id, '[9] 다부위 좌·우 줄임 (측정다중·부속다중)', 28000, 9,
    true, true, 2, ARRAY['상단 (cm)', '하단 (cm)'],
    true, true, '줄일 부위를 모두 선택하세요'
  ) RETURNING id INTO rid;

  INSERT INTO public.repair_sub_parts (repair_type_id, name, price, display_order) VALUES
    (rid, '왼팔', 28000, 1),
    (rid, '오른팔', 28000, 2),
    (rid, '앞섶', 30000, 3),
    (rid, '뒤판', 0, 4);  -- 폴백
END $$;

-- 검증 쿼리
SELECT
  rt.display_order AS "case",
  rt.name,
  rt.price,
  rt.requires_measurement AS meas,
  rt.requires_multiple_inputs AS multi_meas,
  rt.input_count AS in_n,
  rt.input_labels,
  rt.has_sub_parts AS subs,
  rt.allow_multiple_sub_parts AS multi_sub,
  rt.sub_parts_title,
  COUNT(sp.id) AS sub_count
FROM public.repair_types rt
LEFT JOIN public.repair_sub_parts sp ON sp.repair_type_id = rt.id
WHERE rt.category_id = (SELECT id FROM public.repair_categories WHERE name = '🧪 9케이스 검증')
GROUP BY rt.id
ORDER BY rt.display_order;
