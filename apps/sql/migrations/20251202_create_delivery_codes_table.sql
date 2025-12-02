-- 집배코드 테이블 생성
-- 우편번호를 기반으로 송장 분류 코드를 조회

CREATE TABLE IF NOT EXISTS delivery_codes (
  zipcode VARCHAR(5) PRIMARY KEY,           -- 우편번호 (5자리)
  sort_code_1 VARCHAR(10) NOT NULL,         -- 집중국번호 (경1)
  sort_code_2 VARCHAR(10) NOT NULL,         -- 배달국번호 (701)
  sort_code_3 VARCHAR(10) NOT NULL,         -- 집배팀번호 (56)
  sort_code_4 VARCHAR(10) NOT NULL,         -- 집배구번호 (05)
  arr_cnpo_nm VARCHAR(50) NOT NULL,         -- 집중국명 (대구M)
  deliv_po_nm VARCHAR(50) NOT NULL,         -- 배달국명 (동대구)
  course_no VARCHAR(10),                    -- 구분코스 (560)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_delivery_codes_zipcode ON delivery_codes(zipcode);
CREATE INDEX IF NOT EXISTS idx_delivery_codes_sort_codes ON delivery_codes(sort_code_1, sort_code_2);

-- RLS 활성화 (읽기 전용)
ALTER TABLE delivery_codes ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 설정
CREATE POLICY "Anyone can read delivery codes"
  ON delivery_codes
  FOR SELECT
  TO public
  USING (true);

-- 주요 우편번호 샘플 데이터 삽입 (대구 동구)
INSERT INTO delivery_codes (zipcode, sort_code_1, sort_code_2, sort_code_3, sort_code_4, arr_cnpo_nm, deliv_po_nm, course_no)
VALUES 
  ('41100', '경1', '701', '56', '05', '대구M', '동대구', '560'),
  ('41101', '경1', '701', '56', '05', '대구M', '동대구', '560'),
  ('41142', '경1', '701', '56', '05', '대구M', '동대구', '560')
ON CONFLICT (zipcode) DO NOTHING;

COMMENT ON TABLE delivery_codes IS '우체국 집배코드 DB - 우편번호별 송장 분류 코드';
COMMENT ON COLUMN delivery_codes.zipcode IS '우편번호 (5자리)';
COMMENT ON COLUMN delivery_codes.sort_code_1 IS '집중국번호 (예: 경1)';
COMMENT ON COLUMN delivery_codes.sort_code_2 IS '배달국번호 (예: 701)';
COMMENT ON COLUMN delivery_codes.sort_code_3 IS '집배팀번호 (예: 56)';
COMMENT ON COLUMN delivery_codes.sort_code_4 IS '집배구번호 (예: 05)';
COMMENT ON COLUMN delivery_codes.arr_cnpo_nm IS '집중국명 (예: 대구M)';
COMMENT ON COLUMN delivery_codes.deliv_po_nm IS '배달국명 (예: 동대구)';
COMMENT ON COLUMN delivery_codes.course_no IS '구분코스 (예: 560)';

