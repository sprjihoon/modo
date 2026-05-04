-- =====================================================
-- repair_categories 테이블에 sub_selection_label 컬럼 추가
-- 중카테고리에 세부카테고리(자식)가 있을 때 표시할 안내 문구
-- 예: "소매기장 줄임" 카테고리의 sub_selection_label = "소매 모양을 선택하세요"
-- NULL이면 기본 문구 사용
-- =====================================================

ALTER TABLE public.repair_categories
  ADD COLUMN IF NOT EXISTS sub_selection_label TEXT;

COMMENT ON COLUMN public.repair_categories.sub_selection_label IS
  '세부카테고리 선택 화면에 표시되는 안내 문구 (예: "소매 모양을 선택하세요"). NULL이면 기본 문구 사용.';
