-- ============================================
-- Media 테이블에 sequence 및 duration 컬럼 추가
-- 여러 아이템 순차 촬영/재생을 위한 스키마 확장
-- ============================================

-- sequence: 촬영 순서 (1, 2, 3...)
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 1;

-- duration_seconds: 영상 길이 (초 단위)
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_media_sequence ON public.media(final_waybill_no, type, sequence);

-- 주석
COMMENT ON COLUMN public.media.sequence IS '촬영 순서 (여러 아이템 촬영 시 1, 2, 3...)';
COMMENT ON COLUMN public.media.duration_seconds IS '영상 길이 (초), 출고 영상 촬영 시 입고 영상과 동일하게 맞추기 위해 사용';

-- 확인
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'media'
  AND column_name IN ('sequence', 'duration_seconds');

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ media 테이블에 sequence, duration_seconds 컬럼이 추가되었습니다!';
  RAISE NOTICE '📹 이제 여러 아이템을 순차적으로 촬영하고 재생할 수 있습니다.';
END $$;

