-- 결제 시 포인트 사용 (최저 1,000P)
-- payment_intents에 사용액 저장 + 예약 차감, orders.points_used 기록

-- 1) enum: 사용 복구
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'point_transaction_type' AND e.enumlabel = 'USE_RESTORE'
  ) THEN
    ALTER TYPE point_transaction_type ADD VALUE 'USE_RESTORE';
  END IF;
END $$;

-- 2) columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0
    CHECK (points_used >= 0);

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0
    CHECK (points_used >= 0),
  ADD COLUMN IF NOT EXISTS charge_before_points INTEGER;

COMMENT ON COLUMN public.orders.points_used IS '결제 시 사용한 포인트';
COMMENT ON COLUMN public.payment_intents.points_used IS '이 인텐트에 예약/적용된 포인트';
COMMENT ON COLUMN public.payment_intents.charge_before_points IS '포인트 차감 전 결제 예정 금액';

-- 3) manage_user_points: USE_RESTORE = 잔액 증가
CREATE OR REPLACE FUNCTION public.manage_user_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_type point_transaction_type,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
  v_customer_email TEXT;
BEGIN
  SELECT point_balance, email INTO v_current_balance, v_customer_email
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_type IN ('EARNED', 'ADMIN_ADD', 'USE_RESTORE') THEN
    v_new_balance := v_current_balance + ABS(p_amount);
  ELSIF p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED', 'EARN_CANCEL') THEN
    v_new_balance := v_current_balance - ABS(p_amount);
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points. Current balance: %, Required: %', v_current_balance, ABS(p_amount);
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  INSERT INTO public.point_transactions (
    user_id, customer_email, type, amount, balance_after,
    description, order_id, admin_user_id, expires_at
  ) VALUES (
    p_user_id,
    v_customer_email,
    p_type,
    CASE
      WHEN p_type IN ('EARNED', 'ADMIN_ADD', 'USE_RESTORE') THEN ABS(p_amount)
      ELSE -ABS(p_amount)
    END,
    v_new_balance,
    p_description,
    p_order_id,
    p_admin_user_id,
    p_expires_at
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.users
  SET
    point_balance = v_new_balance,
    total_earned_points = CASE
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN total_earned_points + ABS(p_amount)
      WHEN p_type = 'EARN_CANCEL' THEN GREATEST(0, total_earned_points - ABS(p_amount))
      ELSE total_earned_points
    END,
    total_used_points = CASE
      WHEN p_type = 'USED' THEN total_used_points + ABS(p_amount)
      WHEN p_type = 'USE_RESTORE' THEN GREATEST(0, total_used_points - ABS(p_amount))
      WHEN p_type IN ('ADMIN_SUB', 'EXPIRED') THEN total_used_points + ABS(p_amount)
      ELSE total_used_points
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_transaction_id;
END;
$$;

-- 4) 인텐트에 포인트 적용/해제 (원자적, 최저 1000)
CREATE OR REPLACE FUNCTION public.apply_points_to_payment_intent(
  p_intent_id UUID,
  p_user_id UUID,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_balance INTEGER;
  v_charge_before INTEGER;
  v_prev_points INTEGER;
  v_points INTEGER;
  v_new_total INTEGER;
  v_min INTEGER := 1000;
BEGIN
  IF p_points IS NULL OR p_points < 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS';
  END IF;

  SELECT * INTO v_intent
  FROM public.payment_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INTENT_NOT_FOUND';
  END IF;
  IF v_intent.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_intent.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'INTENT_CONSUMED';
  END IF;
  IF v_intent.expires_at < NOW() THEN
    RAISE EXCEPTION 'INTENT_EXPIRED';
  END IF;

  v_prev_points := COALESCE(v_intent.points_used, 0);
  v_charge_before := COALESCE(
    v_intent.charge_before_points,
    v_intent.total_price + v_prev_points
  );

  -- 기존 예약 복구
  IF v_prev_points > 0 THEN
    PERFORM manage_user_points(
      p_user_id,
      v_prev_points,
      'USE_RESTORE'::point_transaction_type,
      '결제 포인트 예약 해제 (intent:' || p_intent_id::text || ')',
      NULL, NULL, NULL
    );
  END IF;

  SELECT point_balance INTO v_balance
  FROM public.users WHERE id = p_user_id FOR UPDATE;

  v_points := p_points;

  IF v_points = 0 THEN
    UPDATE public.payment_intents
    SET points_used = 0,
        charge_before_points = v_charge_before,
        total_price = v_charge_before
    WHERE id = p_intent_id;

    RETURN jsonb_build_object(
      'ok', true,
      'points_used', 0,
      'total_price', v_charge_before,
      'charge_before_points', v_charge_before,
      'point_balance', v_balance
    );
  END IF;

  IF v_points < v_min THEN
    RAISE EXCEPTION 'MIN_POINTS';
  END IF;
  IF v_balance < v_min THEN
    RAISE EXCEPTION 'BALANCE_TOO_LOW';
  END IF;
  IF v_points > v_balance THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;
  IF v_points > v_charge_before THEN
    RAISE EXCEPTION 'EXCEEDS_TOTAL';
  END IF;

  PERFORM manage_user_points(
    p_user_id,
    v_points,
    'USED'::point_transaction_type,
    '결제 포인트 사용 예약 (intent:' || p_intent_id::text || ')',
    NULL, NULL, NULL
  );

  v_new_total := v_charge_before - v_points;

  UPDATE public.payment_intents
  SET points_used = v_points,
      charge_before_points = v_charge_before,
      total_price = v_new_total
  WHERE id = p_intent_id;

  SELECT point_balance INTO v_balance FROM public.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'points_used', v_points,
    'total_price', v_new_total,
    'charge_before_points', v_charge_before,
    'point_balance', v_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_points_to_payment_intent(UUID, UUID, INTEGER)
  TO authenticated, service_role;

-- 5) 주문 취소 시 사용 포인트 복구 헬퍼
CREATE OR REPLACE FUNCTION public.restore_order_points_used(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_already BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF COALESCE(v_order.points_used, 0) <= 0 THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE order_id = p_order_id
      AND type = 'USE_RESTORE'
      AND description LIKE '주문 취소 포인트 복구%'
  ) INTO v_already;

  IF v_already THEN RETURN FALSE; END IF;

  PERFORM manage_user_points(
    v_order.user_id,
    v_order.points_used,
    'USE_RESTORE'::point_transaction_type,
    '주문 취소 포인트 복구',
    p_order_id,
    NULL,
    NULL
  );
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_order_points_used(UUID) TO service_role;
