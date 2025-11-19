-- ============================================
-- 세부 부위 다중/단일 선택 플래그 추가
-- ============================================

-- repair_types 테이블에 allow_multiple_sub_parts 컬럼 추가
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS allow_multiple_sub_parts BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.repair_types.allow_multiple_sub_parts IS '세부 부위 다중 선택 허용 여부 (false: 단일 선택, true: 다중 선택)';

-- 기본값: 세부 부위가 있는 항목은 단일 선택만 허용
UPDATE public.repair_types
SET allow_multiple_sub_parts = false
WHERE has_sub_parts = true;

