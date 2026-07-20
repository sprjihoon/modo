-- 기장 + 밑통 복합 가이드 키 (총기장 + 전체 통을 함께 표시)
-- 값: length-leg-width

UPDATE public.repair_categories
SET measure_guide_key = 'length-leg-width'
WHERE measure_guide_key IS NULL
  AND name ILIKE '%기장%'
  AND name ILIKE '%밑통%';

UPDATE public.repair_types
SET measure_guide_key = 'length-leg-width'
WHERE measure_guide_key IS NULL
  AND name ILIKE '%기장%'
  AND name ILIKE '%밑통%';

-- 이미 다른 키로 잘못 잡힌 경우도 이름 기준으로 보정
UPDATE public.repair_categories
SET measure_guide_key = 'length-leg-width'
WHERE name ILIKE '%기장%'
  AND name ILIKE '%밑통%';

UPDATE public.repair_types
SET measure_guide_key = 'length-leg-width'
WHERE name ILIKE '%기장%'
  AND name ILIKE '%밑통%';
