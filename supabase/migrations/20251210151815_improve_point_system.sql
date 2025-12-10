-- ============================================
-- 포인트 시스템 개선: 중복 적립 방지 및 환불 처리
-- ============================================

-- 1. 포인트 거래 유형에 'EARN_CANCEL' 추가
-- 트랜잭션 내에서 ENUM 변경이 어려울 수 있으므로 별도 실행 권장하지만, 
-- 여기서는 DO 블록으로 안전하게 처리 시도
DO $$ 
BEGIN
  ALTER TYPE point_transaction_type ADD VALUE IF NOT EXISTS 'EARN_CANCEL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. manage_user_points 함수 업데이트 (EARN_CANCEL 처리 추가)
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
  ELSIF p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED', 'EARN_CANCEL') THEN
    v_new_balance := v_current_balance - ABS(p_amount);
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points. Current balance: %, Required: %', v_current_balance, ABS(p_amount);
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;
  
  -- 포인트 거래 내역 삽입
  INSERT INTO public.point_transactions (
    user_id,
    customer_email, -- 이메일 필드가 테이블에 존재한다고 가정 (이전 마이그레이션 참조)
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
  
  -- 사용자 포인트 잔액 및 통계 업데이트
  UPDATE public.users
  SET 
    point_balance = v_new_balance,
    total_earned_points = CASE 
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN total_earned_points + ABS(p_amount)
      WHEN p_type = 'EARN_CANCEL' THEN total_earned_points - ABS(p_amount) -- 취소 시 총 적립액 차감
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

-- 3. 자동 적립 트리거 함수 개선 (중복 방지 및 환불 처리)
CREATE OR REPLACE FUNCTION auto_earn_points_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_earning_rate DECIMAL(5,2);
  v_points_to_earn INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_existing_earn_id UUID;
  v_existing_earn_amount INTEGER;
  v_current_user_balance INTEGER;
  v_refund_amount INTEGER;
BEGIN
  -- 1. DELIVERED 상태로 변경 시 (적립)
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
    
    -- 이미 적립된 내역이 있는지 확인
    SELECT id INTO v_existing_earn_id
    FROM public.point_transactions
    WHERE order_id = NEW.id AND type = 'EARNED'
    LIMIT 1;

    -- 이미 적립된 내역이 있다면 스킵 (중복 적립 방지)
    IF v_existing_earn_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- 현재 적립률 조회
    SELECT earning_rate INTO v_earning_rate
    FROM get_current_point_setting()
    LIMIT 1;
    
    IF v_earning_rate IS NULL THEN
      v_earning_rate := 0;
    END IF;
    
    -- 적립 포인트 계산
    v_points_to_earn := FLOOR(NEW.total_price * v_earning_rate / 100);
    
    IF v_points_to_earn > 0 THEN
      v_expires_at := NOW() + INTERVAL '1 year';
      
      -- 포인트 적립 실행
      PERFORM manage_user_points(
        NEW.user_id,
        v_points_to_earn,
        'EARNED'::point_transaction_type,
        FORMAT('주문 완료 적립 (%s%%)', v_earning_rate),
        NEW.id,
        NULL,
        v_expires_at
      );
    END IF;

  -- 2. CANCELLED 또는 REFUNDED 상태로 변경 시 (적립 취소)
  ELSIF NEW.status IN ('CANCELLED', 'REFUNDED') AND OLD.status = 'DELIVERED' THEN
    
    -- 이 주문으로 적립된 포인트가 있는지 확인
    SELECT amount INTO v_existing_earn_amount
    FROM public.point_transactions
    WHERE order_id = NEW.id AND type = 'EARNED'
    LIMIT 1;
    
    -- 적립된 포인트가 있다면 회수 시도
    IF v_existing_earn_amount IS NOT NULL AND v_existing_earn_amount > 0 THEN
      
      -- 사용자의 현재 잔액 확인
      SELECT point_balance INTO v_current_user_balance
      FROM public.users
      WHERE id = NEW.user_id;
      
      -- 회수 가능한 금액 계산 (잔액보다 많이 회수할 수 없음)
      v_refund_amount := LEAST(v_existing_earn_amount, v_current_user_balance);
      
      IF v_refund_amount > 0 THEN
        PERFORM manage_user_points(
          NEW.user_id,
          v_refund_amount,
          'EARN_CANCEL'::point_transaction_type,
          '주문 취소/환불로 인한 적립 취소',
          NEW.id,
          NULL,
          NULL
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주석 업데이트
COMMENT ON FUNCTION auto_earn_points_on_order_complete IS '주문 완료 시 자동 포인트 적립 (중복 방지 및 환불 처리 포함)';

