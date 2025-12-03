-- company_info 테이블에 label_layout_config 컬럼 추가
-- 송장 레이아웃 에디터에서 설정한 JSON 데이터를 저장

ALTER TABLE company_info 
ADD COLUMN IF NOT EXISTS label_layout_config TEXT;

COMMENT ON COLUMN company_info.label_layout_config IS '송장 레이아웃 에디터 설정 (JSON string)';

