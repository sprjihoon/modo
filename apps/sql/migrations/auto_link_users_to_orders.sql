-- ============================================
-- 주문에 자동으로 사용자 연결하기
-- customer_email을 기준으로 매칭
-- ============================================

-- 1단계: user_id가 없는 주문 확인
SELECT 
  id, 
  order_number,
  customer_name, 
  customer_email, 
  customer_phone,
  created_at
FROM orders
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2단계: customer_email로 기존 사용자 찾아서 연결
UPDATE orders o
SET user_id = u.id
FROM users u
WHERE o.user_id IS NULL
  AND o.customer_email = u.email
  AND o.customer_email IS NOT NULL;

-- 3단계: 아직도 user_id가 없는 주문에 대해 새 사용자 생성
INSERT INTO users (email, name, phone, point_balance, total_earned_points, total_used_points, auth_id)
SELECT DISTINCT ON (customer_email)
  customer_email,
  customer_name,
  COALESCE(customer_phone, ''),
  0,
  0,
  0,
  NULL
FROM orders
WHERE user_id IS NULL
  AND customer_email IS NOT NULL
  AND customer_email NOT IN (SELECT email FROM users)
ON CONFLICT (email) DO NOTHING;

-- 4단계: 새로 생성된 사용자를 주문에 연결
UPDATE orders o
SET user_id = u.id
FROM users u
WHERE o.user_id IS NULL
  AND o.customer_email = u.email
  AND o.customer_email IS NOT NULL;

-- 5단계: user_id는 있지만 users 테이블에 없는 경우 처리
INSERT INTO users (id, email, name, phone, point_balance, total_earned_points, total_used_points, auth_id)
SELECT DISTINCT ON (o.user_id)
  o.user_id,
  o.customer_email,
  o.customer_name,
  COALESCE(o.customer_phone, ''),
  0,
  0,
  0,
  NULL
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.user_id IS NOT NULL
  AND u.id IS NULL
  AND o.customer_email IS NOT NULL
ON CONFLICT (id) DO NOTHING
ON CONFLICT (email) DO UPDATE 
  SET id = EXCLUDED.id; -- 이메일이 이미 있으면 user_id 업데이트

-- 6단계: 결과 확인
SELECT 
  COUNT(*) as total_orders,
  COUNT(user_id) as orders_with_user,
  COUNT(*) - COUNT(user_id) as orders_without_user
FROM orders;

-- 7단계: 고아 user_id 확인 (있으면 안됨)
SELECT 
  o.id as order_id,
  o.order_number,
  o.user_id,
  o.customer_email
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.user_id IS NOT NULL
  AND u.id IS NULL
LIMIT 5;

COMMENT ON COLUMN orders.user_id IS '사용자 ID (customer_email로 자동 매칭)';

