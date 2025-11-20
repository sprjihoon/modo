-- clothing_type을 ENUM에서 TEXT로 변경
ALTER TABLE orders ALTER COLUMN clothing_type TYPE TEXT;

-- 기존 ENUM 값들은 그대로 유지되지만, 이제 어떤 텍스트든 입력 가능
-- 이렇게 하면 관리자가 추가한 새로운 카테고리도 자동으로 지원됨

