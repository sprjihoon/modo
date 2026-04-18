-- 왕복배송비(shipping_fee) 컬럼 추가
-- 신규 주문부터 7,000원 기본값으로 적용
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_fee INTEGER DEFAULT 7000;

COMMENT ON COLUMN orders.shipping_fee IS '왕복배송비 (기본값 7,000원)';
