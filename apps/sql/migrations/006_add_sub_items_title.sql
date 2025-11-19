-- ============================================
-- 세부 항목 선택 제목 커스터마이징
-- ============================================

-- repair_types 테이블에 세부 항목 선택 제목 컬럼 추가
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS sub_parts_title TEXT;

COMMENT ON COLUMN public.repair_types.sub_parts_title IS '세부 항목 선택 화면 제목 (예: "소매 모양을 선택하세요", "수선할 부위를 선택해주세요")';

-- 기본값 설정
UPDATE public.repair_types
SET sub_parts_title = '상세 수선 부위를 선택해주세요'
WHERE has_sub_parts = true AND sub_parts_title IS NULL;

