-- ============================================
-- 세부 타입 제거 (세부 부위와 중복)
-- ============================================

-- repair_types 테이블에서 has_sub_types 컬럼 제거
ALTER TABLE public.repair_types
  DROP COLUMN IF EXISTS has_sub_types;

-- repair_sub_parts 테이블에서 세부 타입 데이터 삭제
DELETE FROM public.repair_sub_parts
WHERE part_type = 'sub_type';

COMMENT ON TABLE public.repair_sub_parts IS '수선 세부 부위 (예: 앞섶, 뒤판, 왼팔, 오른팔)';

