-- 고객명 오류 수정 스크립트
-- "11122 고객님"을 올바른 이름으로 수정

-- 1. 문제가 있는 주소 확인
SELECT 
  id, 
  recipient_name, 
  address, 
  zipcode, 
  recipient_phone,
  created_at 
FROM addresses 
WHERE recipient_name LIKE '%11122%' OR recipient_name LIKE '%고객님%'
ORDER BY created_at DESC;

-- 2. 문제가 있는 주문 확인
SELECT 
  id, 
  order_number, 
  customer_name, 
  pickup_address,
  customer_phone,
  created_at 
FROM orders 
WHERE customer_name LIKE '%11122%' OR customer_name LIKE '%고객님%'
ORDER BY created_at DESC;

-- 3. 주소 테이블 수정 (올바른 이름으로 변경)
-- 예시: '홍길동'으로 변경하려면 아래 주석 해제하고 실행
-- UPDATE addresses 
-- SET recipient_name = '홍길동' 
-- WHERE recipient_name = '11122 고객님';

-- 4. 주문 테이블 수정 (올바른 이름으로 변경)
-- UPDATE orders 
-- SET customer_name = '홍길동' 
-- WHERE customer_name = '11122 고객님';

-- 5. shipments 테이블도 확인 (이미 수거 신청된 경우)
SELECT 
  id, 
  order_id, 
  customer_name, 
  tracking_no,
  created_at 
FROM shipments 
WHERE customer_name LIKE '%11122%' OR customer_name LIKE '%고객님%'
ORDER BY created_at DESC;

-- 6. shipments 테이블 수정
-- UPDATE shipments 
-- SET customer_name = '홍길동' 
-- WHERE customer_name = '11122 고객님';

