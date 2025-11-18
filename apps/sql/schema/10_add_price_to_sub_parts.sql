-- ============================================
-- 세부 부위에 가격 추가
-- ============================================

-- repair_sub_parts 테이블에 가격 컬럼 추가
ALTER TABLE public.repair_sub_parts
  ADD COLUMN IF NOT EXISTS price INT DEFAULT 0;

-- 주석
COMMENT ON COLUMN public.repair_sub_parts.price IS '세부 부위별 개별 가격 (선택 시 추가)';

-- 샘플 데이터 업데이트 (전체품 줄임의 각 부위별 가격)
UPDATE public.repair_sub_parts
SET price = 10000
WHERE name IN ('앞섶', '뒤판', '왼팔', '오른팔');


