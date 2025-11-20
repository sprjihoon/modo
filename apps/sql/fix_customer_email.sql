-- customer_email 컬럼을 nullable로 변경
ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL;

-- 또는 기존 NULL 값을 빈 문자열로 업데이트
UPDATE orders SET customer_email = '' WHERE customer_email IS NULL;

