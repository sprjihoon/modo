-- 쿠폰과 포인트는 함께 쓸 수 없다. 쿠폰이 있으면 포인트 적용을 거절한다.

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
  v_promo_amt INTEGER;
  v_promo_id TEXT;
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

  IF p_points > 0 THEN
    v_promo_amt := COALESCE((v_intent.payload->>'promotionDiscountAmount')::int, 0);
    v_promo_id := NULLIF(btrim(COALESCE(v_intent.payload->>'promotionCodeId', '')), '');
    IF v_promo_amt > 0 OR v_promo_id IS NOT NULL THEN
      RAISE EXCEPTION 'COUPON_APPLIED';
    END IF;
  END IF;

  v_prev_points := COALESCE(v_intent.points_used, 0);
  v_charge_before := COALESCE(
    v_intent.charge_before_points,
    v_intent.total_price + v_prev_points
  );

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
