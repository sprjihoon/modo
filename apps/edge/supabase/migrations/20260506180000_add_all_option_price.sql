-- repair_types에 '전체' 옵션 선택 시 적용될 가격 컬럼 추가
ALTER TABLE repair_types
ADD COLUMN IF NOT EXISTS all_option_price integer DEFAULT NULL;

COMMENT ON COLUMN repair_types.all_option_price IS '전체 옵션 선택 시 적용되는 가격 (NULL이면 기본 price 사용)';
