-- company_info 테이블에 footer_header 컬럼 추가
-- 앱 하단 푸터의 헤더(접기/펼치기)에 표시될 이름

-- footer_header 컬럼 추가 (없으면)
ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS footer_header TEXT DEFAULT '모두의 수선';

-- 기존 레코드에 기본값 설정
UPDATE company_info 
SET footer_header = '모두의 수선'
WHERE footer_header IS NULL;

-- 확인
COMMENT ON COLUMN company_info.footer_header IS '앱 푸터 헤더에 표시될 이름 (예: 모두의 수선)';
