-- company_info 테이블에 label_background_image_url 컬럼 추가
-- 배경 이미지 URL을 저장하기 위한 컬럼

ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS label_background_image_url TEXT;

-- 주석 추가
COMMENT ON COLUMN company_info.label_background_image_url IS '레이블 에디터 배경 이미지 URL';

