-- ============================================
-- 누락된 컬럼 모두 추가
-- ============================================

-- 1. allow_multiple_sub_parts 컬럼 추가
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS allow_multiple_sub_parts BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.repair_types.allow_multiple_sub_parts IS '세부 부위 다중 선택 허용 여부 (false: 단일 선택, true: 다중 선택)';

-- 2. has_sub_types 컬럼 제거 (이미 없을 수 있음)
ALTER TABLE public.repair_types
  DROP COLUMN IF EXISTS has_sub_types;

-- 3. 기본값 설정
UPDATE public.repair_types
SET allow_multiple_sub_parts = false
WHERE has_sub_parts = true AND allow_multiple_sub_parts IS NULL;

-- 4. repair_sub_parts 테이블에서 세부 타입 데이터 삭제
DELETE FROM public.repair_sub_parts
WHERE part_type = 'sub_type';

-- 확인용 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'repair_types' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

