-- ============================================
-- 모두의수선 - 수선 세부 부위 테이블
-- ============================================

-- repair_types 테이블에 컬럼 추가
ALTER TABLE public.repair_types
  ADD COLUMN IF NOT EXISTS requires_multiple_inputs BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS input_count INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_labels TEXT[] DEFAULT ARRAY['치수'],
  ADD COLUMN IF NOT EXISTS has_sub_parts BOOLEAN DEFAULT false;

-- 세부 부위 테이블 (예: 앞섶, 뒤판, 왼팔, 오른팔)
CREATE TABLE IF NOT EXISTS public.repair_sub_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 수선 종류 참조
  repair_type_id UUID NOT NULL REFERENCES public.repair_types(id) ON DELETE CASCADE,
  
  -- 세부 부위 정보
  name TEXT NOT NULL,                    -- 부위명 (예: 앞섶, 뒤판, 왼팔, 오른팔)
  display_order INT NOT NULL DEFAULT 0,  -- 표시 순서
  icon_name TEXT,                        -- 아이콘 파일명
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT repair_sub_parts_unique UNIQUE (repair_type_id, name)
);

-- RLS 활성화
ALTER TABLE public.repair_sub_parts ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 조회 가능
CREATE POLICY "Anyone can view repair sub parts"
  ON public.repair_sub_parts
  FOR SELECT
  USING (true);

-- 정책: 관리자만 관리 가능
CREATE POLICY "Admins can manage repair sub parts"
  ON public.repair_sub_parts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX idx_repair_sub_parts_type ON public.repair_sub_parts(repair_type_id);
CREATE INDEX idx_repair_sub_parts_order ON public.repair_sub_parts(display_order);

-- 트리거
CREATE TRIGGER update_repair_sub_parts_updated_at
  BEFORE UPDATE ON public.repair_sub_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.repair_sub_parts IS '수선 세부 부위 (예: 앞섶, 뒤판, 왼팔, 오른팔)';
COMMENT ON COLUMN public.repair_types.requires_multiple_inputs IS '여러 입력값 필요 여부 (예: 왼쪽/오른쪽 따로)';
COMMENT ON COLUMN public.repair_types.input_count IS '필요한 입력 필드 개수';
COMMENT ON COLUMN public.repair_types.input_labels IS '입력 필드 라벨 배열';
COMMENT ON COLUMN public.repair_types.has_sub_parts IS '세부 부위 선택 필요 여부';

-- 샘플 데이터: 어깨길이 줄임 (입력값 2개)
UPDATE public.repair_types
SET 
  requires_multiple_inputs = true,
  input_count = 2,
  input_labels = ARRAY['왼쪽 어깨 (cm)', '오른쪽 어깨 (cm)']
WHERE name = '어깨길이 줄임';

-- 샘플 데이터: 전체품 줄임에 세부 부위 추가
DO $$
DECLARE
  repair_id UUID;
BEGIN
  -- "전체품 줄임 - 기본형" 항목 찾기
  SELECT id INTO repair_id 
  FROM public.repair_types 
  WHERE name = '전체품 줄임' AND sub_type = '기본형'
  LIMIT 1;
  
  IF repair_id IS NOT NULL THEN
    -- has_sub_parts 활성화
    UPDATE public.repair_types 
    SET has_sub_parts = true 
    WHERE id = repair_id;
    
    -- 세부 부위 추가
    INSERT INTO public.repair_sub_parts (repair_type_id, name, display_order) VALUES
      (repair_id, '앞섶', 1),
      (repair_id, '뒤판', 2),
      (repair_id, '왼팔', 3),
      (repair_id, '오른팔', 4)
    ON CONFLICT (repair_type_id, name) DO NOTHING;
  END IF;
END $$;


