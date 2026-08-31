-- 세부 부위마다 입력 개수·라벨을 둘 수 있게 한다.
-- 예: 허리+힙 → 허리 (cm), 힙 (cm) / 허리만 → 허리 (cm)

ALTER TABLE public.repair_sub_parts
  ADD COLUMN IF NOT EXISTS input_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_labels TEXT[];

ALTER TABLE public.repair_sub_parts
  DROP CONSTRAINT IF EXISTS repair_sub_parts_input_count_check;

ALTER TABLE public.repair_sub_parts
  ADD CONSTRAINT repair_sub_parts_input_count_check
  CHECK (input_count >= 1 AND input_count <= 4);

COMMENT ON COLUMN public.repair_sub_parts.input_count IS
  '이 부위를 선택할 때 받을 치수 칸 수. 1이면 input_labels 가 없을 때 상위 항목 라벨을 따른다.';
COMMENT ON COLUMN public.repair_sub_parts.input_labels IS
  '치수 칸 라벨. NULL/빈 배열이면 상위 수선 항목 라벨을 사용한다.';

-- 기존 허리+힙 콤보는 값 2개
UPDATE public.repair_sub_parts
SET
  input_count = 2,
  input_labels = ARRAY['허리 (cm)', '힙 (cm)']
WHERE regexp_replace(name, '\s+', '', 'g') IN ('허리+힙', '허리힙');
