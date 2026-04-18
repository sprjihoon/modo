-- 도서산간 추가 배송비 컬럼 추가
-- 우체국 기준 도서산간 지역: 편도 400원, 왕복 800원 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS remote_area_fee INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.remote_area_fee IS '도서산간 추가 배송비 (왕복: 800원, 일반: 0원)';
