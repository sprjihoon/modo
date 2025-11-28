-- 최근 생성된 수거예약 확인

-- 1. 최근 주문 (방금 생성된 것)
SELECT 
  id,
  order_number,
  customer_name,
  status,
  tracking_no,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;

-- 2. 최근 shipment 정보
SELECT 
  s.id,
  s.order_id,
  s.pickup_tracking_no,
  s.delivery_tracking_no,
  s.status,
  s.created_at,
  o.customer_name,
  o.order_number
FROM public.shipments s
LEFT JOIN public.orders o ON s.order_id = o.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 3. 가장 최근 수거예약 상세 정보
SELECT 
  s.*,
  o.customer_name,
  o.pickup_address,
  o.pickup_phone
FROM public.shipments s
LEFT JOIN public.orders o ON s.order_id = o.id
ORDER BY s.created_at DESC
LIMIT 1;

