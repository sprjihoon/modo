-- 집배코드 CSV 데이터 import 스크립트
-- Supabase Dashboard > SQL Editor에서 실행하거나
-- psql로 실행: psql <connection_string> -f import_delivery_codes.sql

-- 1. 기존 데이터 삭제 (선택사항)
-- TRUNCATE TABLE delivery_codes;

-- 2. CSV 파일에서 데이터 import
-- 방법 1: Supabase Dashboard에서 직접 import
--   - Table Editor > delivery_codes 테이블 선택
--   - Import data from CSV 선택
--   - delivery-codes-all.csv 파일 업로드

-- 방법 2: COPY 명령 사용 (Supabase CLI 또는 psql)
-- COPY delivery_codes (zipcode, sort_code_1, sort_code_2, sort_code_3, sort_code_4, arr_cnpo_nm, deliv_po_nm, course_no)
-- FROM '/path/to/delivery-codes-all.csv'
-- WITH (FORMAT csv, HEADER true);

-- 방법 3: Node.js 스크립트로 bulk insert (권장)
-- 아래 import-delivery-codes.js 스크립트 실행

