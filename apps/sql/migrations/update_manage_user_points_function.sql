-- ============================================
-- 포인트 지급/차감 함수 업데이트
-- ============================================
-- customer_email 필드를 포함하도록 함수 수정

-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS manage_user_points(UUID, INTEGER, point_transaction_type, TEXT, UUID, UUID, TIMESTAMPTZ);

-- 포인트 지급/차감 함수 (이메일 포함)
CREATE OR REPLACE FUNCTION manage_user_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_type point_transaction_type,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_customer_email TEXT;
BEGIN
  -- 현재 포인트 잔액 및 이메일 조회
  SELECT point_balance, email INTO v_current_balance, v_customer_email
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- 새로운 잔액 계산
  IF p_type IN ('EARNED', 'ADMIN_ADD') THEN
    v_new_balance := v_current_balance + ABS(p_amount);
  ELSIF p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED') THEN
    v_new_balance := v_current_balance - ABS(p_amount);
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points. Current balance: %, Required: %', v_current_balance, ABS(p_amount);
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;
  
  -- 포인트 거래 내역 삽입 (이메일 포함)
  INSERT INTO public.point_transactions (
    user_id,
    customer_email,
    type,
    amount,
    balance_after,
    description,
    order_id,
    admin_user_id,
    expires_at
  ) VALUES (
    p_user_id,
    v_customer_email,
    p_type,
    CASE 
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN ABS(p_amount)
      ELSE -ABS(p_amount)
    END,
    v_new_balance,
    p_description,
    p_order_id,
    p_admin_user_id,
    p_expires_at
  )
  RETURNING id INTO v_transaction_id;
  
  -- 사용자 포인트 잔액 업데이트
  UPDATE public.users
  SET 
    point_balance = v_new_balance,
    total_earned_points = CASE 
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN total_earned_points + ABS(p_amount)
      ELSE total_earned_points
    END,
    total_used_points = CASE 
      WHEN p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED') THEN total_used_points + ABS(p_amount)
      ELSE total_used_points
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 주석
COMMENT ON FUNCTION manage_user_points IS '포인트 지급/차감 함수 (이메일 포함)';

