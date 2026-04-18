-- PENDING_PAYMENT 주문 중 total_price가 repair_parts 합산과 일치하는 경우
-- (즉, 배송비가 total_price에 포함되지 않은 주문) → 배송비 추가
--
-- repair_parts는 TEXT[] 형태로 저장되며 각 element는 JSON 문자열
-- 예: '{"name":"수선","price":11000,"quantity":1}'
--
-- 예: repair_parts 합 = 11000, shipping_fee = 7000, total_price = 11000
--     → total_price를 18000으로 수정

WITH repair_sums AS (
  SELECT
    id,
    COALESCE(
      (
        SELECT SUM(
          (elem::jsonb->>'price')::numeric
          * COALESCE((elem::jsonb->>'quantity')::numeric, 1)
        )
        FROM unnest(repair_parts) AS elem
        WHERE elem ~ '^\{.*\}$'
          AND (elem::jsonb->>'price') IS NOT NULL
          AND (elem::jsonb->>'price') ~ '^\d+(\.\d+)?$'
      ),
      0
    ) AS parts_sum
  FROM orders
  WHERE
    status = 'PENDING_PAYMENT'
    AND COALESCE(shipping_fee, 0) > 0
    AND repair_parts IS NOT NULL
    AND array_length(repair_parts, 1) > 0
)
UPDATE orders o
SET total_price = o.total_price + COALESCE(o.shipping_fee, 7000)
FROM repair_sums r
WHERE
  o.id = r.id
  AND r.parts_sum > 0
  AND ABS(o.total_price - r.parts_sum) <= 100;
