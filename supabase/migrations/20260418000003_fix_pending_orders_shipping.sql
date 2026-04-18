-- 기존 PENDING_PAYMENT 주문의 배송비 수정
-- shipping_fee가 null이거나 total_price에 배송비가 포함되지 않은 주문 대상

UPDATE orders
SET
  shipping_fee = 7000,
  total_price = CASE
    -- shipping_fee가 null인 경우 → 배송비가 전혀 없던 주문 → 7000 추가
    WHEN shipping_fee IS NULL THEN total_price + 7000
    -- shipping_fee가 있지만 total_price가 shipping_fee보다 작은 경우
    -- → DEFAULT 7000이 채워졌지만 total_price에는 포함 안 된 케이스
    WHEN total_price < shipping_fee THEN total_price + shipping_fee
    ELSE total_price
  END
WHERE
  status = 'PENDING_PAYMENT'
  AND (
    shipping_fee IS NULL
    OR total_price < shipping_fee
  );
