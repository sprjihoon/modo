-- =====================================================
-- repair_categories 테이블에 직접 가격/치수 입력 필드 추가
-- 소카테고리가 repair_types 없이 직접 수선 항목(가격+치수)을 가질 수 있도록
-- price가 설정된 카테고리는 선택 즉시 해당 항목으로 주문에 추가되며
-- RepairTypeStep을 건너뜁니다.
-- =====================================================

ALTER TABLE public.repair_categories
  ADD COLUMN IF NOT EXISTS price INTEGER,
  ADD COLUMN IF NOT EXISTS price_range TEXT,
  ADD COLUMN IF NOT EXISTS requires_measurement BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS input_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_labels TEXT[],
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.repair_categories.price IS
  '직접 가격 (설정 시 이 카테고리가 곧 수선 항목이 됨, RepairTypeStep 건너뜀)';
COMMENT ON COLUMN public.repair_categories.price_range IS
  '가격 범위 표시 텍스트 (예: "15,000원~")';
COMMENT ON COLUMN public.repair_categories.requires_measurement IS
  '수치 입력 필요 여부';
COMMENT ON COLUMN public.repair_categories.input_count IS
  '수치 입력 개수 (1: 단일, 2: 왼쪽/오른쪽 등)';
COMMENT ON COLUMN public.repair_categories.input_labels IS
  '수치 입력 필드 라벨 배열 (예: ["왼쪽어깨", "오른쪽어깨"])';
COMMENT ON COLUMN public.repair_categories.description IS
  '수선 항목 설명 (사용자에게 안내 문구로 표시)';
