-- ============================================
-- repair_types 테이블에 아이콘 추가
-- ============================================

ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS icon_name TEXT;

COMMENT ON COLUMN public.repair_types.icon_name IS '수선 항목 아이콘 파일명 (예: sleeve_shorten.svg)';

-- 샘플 아이콘 설정
UPDATE public.repair_types SET icon_name = 'sleeve_shorten' WHERE name = '소매기장 줄임';
UPDATE public.repair_types SET icon_name = 'arm_slim' WHERE name = '전체팔통 줄임';
UPDATE public.repair_types SET icon_name = 'shoulder' WHERE name = '어깨길이 줄임';
UPDATE public.repair_types SET icon_name = 'body_slim' WHERE name = '전체품 줄임';
UPDATE public.repair_types SET icon_name = 'length' WHERE name = '총기장 줄임';
UPDATE public.repair_types SET icon_name = 'repair' WHERE name LIKE '%부속품%';


