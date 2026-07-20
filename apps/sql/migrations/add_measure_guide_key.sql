-- 수선 메뉴 ↔ 치수 재는 방법 가이드 매칭 키
-- 값 예: sleeve-length, shoulder, width-top, total-length-top, arm-width,
--        total-length-bottom, waist-hip, leg-width, rise

ALTER TABLE public.repair_categories
  ADD COLUMN IF NOT EXISTS measure_guide_key TEXT;

ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS measure_guide_key TEXT;

COMMENT ON COLUMN public.repair_categories.measure_guide_key IS
  '치수 재는 방법 가이드 ID (MeasureGuideClient TYPES.id)';
COMMENT ON COLUMN public.repair_types.measure_guide_key IS
  '치수 재는 방법 가이드 ID (MeasureGuideClient TYPES.id)';

-- 기존 데이터 이름 기반 자동 매칭
UPDATE public.repair_categories SET measure_guide_key = 'sleeve-length'
  WHERE measure_guide_key IS NULL AND name ILIKE '%소매기장%';
UPDATE public.repair_categories SET measure_guide_key = 'shoulder'
  WHERE measure_guide_key IS NULL AND name ILIKE '%어깨%';
UPDATE public.repair_categories SET measure_guide_key = 'arm-width'
  WHERE measure_guide_key IS NULL AND name ILIKE '%팔통%';
UPDATE public.repair_categories SET measure_guide_key = 'rise'
  WHERE measure_guide_key IS NULL AND name ILIKE '%밑위%';
UPDATE public.repair_categories SET measure_guide_key = 'waist-hip'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%허리%' OR name ILIKE '%힙%');
UPDATE public.repair_categories SET measure_guide_key = 'width-top'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%전체 품%' OR name ILIKE '%전체품%' OR name ILIKE '%품 줄임%');
UPDATE public.repair_categories SET measure_guide_key = 'leg-width'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%전체 통%' OR name ILIKE '%전체통%');
UPDATE public.repair_categories SET measure_guide_key = 'total-length-bottom'
  WHERE measure_guide_key IS NULL AND name ILIKE '%총 기장%' AND (name ILIKE '%바지%' OR name ILIKE '%스커트%' OR name ILIKE '%치마%');
UPDATE public.repair_categories SET measure_guide_key = 'total-length-top'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%총 기장%' OR name ILIKE '%총기장%');

UPDATE public.repair_types SET measure_guide_key = 'sleeve-length'
  WHERE measure_guide_key IS NULL AND name ILIKE '%소매기장%';
UPDATE public.repair_types SET measure_guide_key = 'shoulder'
  WHERE measure_guide_key IS NULL AND name ILIKE '%어깨%';
UPDATE public.repair_types SET measure_guide_key = 'arm-width'
  WHERE measure_guide_key IS NULL AND name ILIKE '%팔통%';
UPDATE public.repair_types SET measure_guide_key = 'rise'
  WHERE measure_guide_key IS NULL AND name ILIKE '%밑위%';
UPDATE public.repair_types SET measure_guide_key = 'waist-hip'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%허리%' OR name ILIKE '%힙%');
UPDATE public.repair_types SET measure_guide_key = 'width-top'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%전체 품%' OR name ILIKE '%전체품%' OR name ILIKE '%품 줄임%');
UPDATE public.repair_types SET measure_guide_key = 'leg-width'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%전체 통%' OR name ILIKE '%전체통%');
UPDATE public.repair_types SET measure_guide_key = 'total-length-bottom'
  WHERE measure_guide_key IS NULL AND name ILIKE '%총 기장%' AND (name ILIKE '%바지%' OR name ILIKE '%스커트%' OR name ILIKE '%치마%');
UPDATE public.repair_types SET measure_guide_key = 'total-length-top'
  WHERE measure_guide_key IS NULL AND (name ILIKE '%총 기장%' OR name ILIKE '%총기장%');
