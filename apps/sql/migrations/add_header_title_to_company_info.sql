-- company_info 테이블에 header_title 컬럼 추가
-- 푸터 아코디언 헤더에 표시될 제목을 별도로 관리

-- header_title 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_info' AND column_name = 'header_title'
  ) THEN
    ALTER TABLE company_info ADD COLUMN header_title TEXT;
  END IF;
END $$;

-- 기존 데이터에 대해 company_name에서 header_title 추출 (괄호 앞 부분)
UPDATE company_info 
SET header_title = COALESCE(
  TRIM(SPLIT_PART(company_name, '(', 1)),
  company_name
)
WHERE header_title IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN company_info.header_title IS '푸터 아코디언 헤더에 표시될 제목';

