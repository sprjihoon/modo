-- ============================================
-- 사용자 존재 여부 확인 및 생성
-- ============================================

-- 1. 해당 user_id가 users 테이블에 있는지 확인
SELECT id, email, name, phone, point_balance, auth_id, created_at
FROM users
WHERE id = '87375e23-e548-4c5f-983b-13a720741b14';

-- 2. 주문에서 해당 user_id를 사용하는 주문 확인
SELECT id, order_number, customer_name, customer_email, customer_phone, user_id, created_at
FROM orders
WHERE user_id = '87375e23-e548-4c5f-983b-13a720741b14'
ORDER BY created_at DESC
LIMIT 5;

-- 3. 만약 사용자가 없다면, 주문 정보로 사용자 생성
-- (위 쿼리 결과가 없으면 아래 실행)
INSERT INTO users (
  id,
  email,
  name,
  phone,
  point_balance,
  total_earned_points,
  total_used_points,
  auth_id
)
SELECT 
  '87375e23-e548-4c5f-983b-13a720741b14'::uuid,
  customer_email,
  customer_name,
  customer_phone,
  0,
  0,
  0,
  NULL
FROM orders
WHERE user_id = '87375e23-e548-4c5f-983b-13a720741b14'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 4. 생성 후 확인
SELECT id, email, name, phone, point_balance, auth_id
FROM users
WHERE id = '87375e23-e548-4c5f-983b-13a720741b14';

