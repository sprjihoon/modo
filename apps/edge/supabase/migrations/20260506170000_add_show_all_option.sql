-- repair_types에 '전체' 옵션 표시 여부 컬럼 추가
ALTER TABLE repair_types
ADD COLUMN IF NOT EXISTS show_all_option boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN repair_types.show_all_option IS '세부 부위 선택 시 "전체" 옵션을 표시할지 여부';
