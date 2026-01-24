-- =====================================================
-- company_info 테이블에 운영시간 컬럼 추가
-- =====================================================

-- 운영시간 컬럼 추가
ALTER TABLE public.company_info
ADD COLUMN IF NOT EXISTS operating_hours_weekday TEXT DEFAULT '09:00 - 18:00',
ADD COLUMN IF NOT EXISTS operating_hours_lunch TEXT DEFAULT '12:00 - 13:00',
ADD COLUMN IF NOT EXISTS operating_hours_weekend TEXT DEFAULT '휴무';

-- 컬럼 코멘트 추가
COMMENT ON COLUMN public.company_info.operating_hours_weekday IS '평일 운영시간 (예: 09:00 - 18:00)';
COMMENT ON COLUMN public.company_info.operating_hours_lunch IS '점심시간 (예: 12:00 - 13:00)';
COMMENT ON COLUMN public.company_info.operating_hours_weekend IS '주말/공휴일 운영 (예: 휴무)';

-- 확인
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'company_info' 
  AND column_name LIKE 'operating_hours%';

