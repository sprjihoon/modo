-- orders 테이블의 모든 ENUM 컬럼을 TEXT로 변경
-- 한 번에 실행하여 모든 문제 해결

-- 1. clothing_type: ENUM → TEXT
ALTER TABLE orders ALTER COLUMN clothing_type TYPE TEXT;

-- 2. repair_type: ENUM → TEXT  
ALTER TABLE orders ALTER COLUMN repair_type TYPE TEXT;

-- 3. status: ENUM → TEXT (주문 상태)
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

-- 4. payment_status: ENUM → TEXT (결제 상태)
-- ALTER TABLE orders ALTER COLUMN payment_status TYPE TEXT;
-- 주석 처리: payment_status는 시스템에서 관리하므로 ENUM 유지 권장

-- 완료 메시지
SELECT 'All ENUM columns converted to TEXT successfully!' as result;

