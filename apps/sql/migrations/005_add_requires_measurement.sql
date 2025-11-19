-- ============================================
-- 수치 입력 필요 여부 플래그 추가
-- ============================================

-- repair_types 테이블에 requires_measurement 컬럼 추가
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS requires_measurement BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.repair_types.requires_measurement IS '수치 입력 필요 여부 (true: 치수 입력, false: 선택만)';

-- 기본값: 대부분 항목은 수치 입력 필요
UPDATE public.repair_types
SET requires_measurement = true
WHERE requires_measurement IS NULL;

-- 부속품 수선류는 수치 입력 불필요
UPDATE public.repair_types
SET requires_measurement = false
WHERE name IN (
  '누빔수선', '누빔 수선',
  '재박음질',
  '단추 달음', '단추 달기',
  '스냅 달음', '스냅(똑딱이) 달기',
  '겉고리 달음', '걸고리 달기',
  '고무줄 교체',
  '주머니 막음',
  '지퍼교체',
  '어깨패드 수선', '아패드 수선(주기/재기/교체)'
);

