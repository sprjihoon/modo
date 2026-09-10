-- 주문 취소 포인트 복구: 잔여분 기준 + 부분 취소 금액 지정
-- 기존 restore_order_points_used(UUID) 는 한 번만 전액 복구하고 재호출을 무시했다.
-- 항목 부분 취소가 여러 번 일어날 수 있으므로 이미 복구한 금액을 빼고 나머지만 환급한다.

DROP FUNCTION IF EXISTS public.restore_order_points_used(UUID);

CREATE OR REPLACE FUNCTION public.restore_order_points_used(
  p_order_id UUID,
  p_amount INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_already INTEGER;
  v_remaining INTEGER;
  v_restore INTEGER;
  v_desc TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF COALESCE(v_order.points_used, 0) <= 0 THEN RETURN FALSE; END IF;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_already
  FROM public.point_transactions
  WHERE order_id = p_order_id
    AND type = 'USE_RESTORE';

  v_remaining := v_order.points_used - v_already;
  IF v_remaining <= 0 THEN RETURN FALSE; END IF;

  IF p_amount IS NULL THEN
    v_restore := v_remaining;
    v_desc := '주문 취소 포인트 복구';
  ELSE
    v_restore := LEAST(v_remaining, GREATEST(0, p_amount));
    v_desc := '주문 부분 취소 포인트 복구';
  END IF;

  IF v_restore <= 0 THEN RETURN FALSE; END IF;

  PERFORM manage_user_points(
    v_order.user_id,
    v_restore,
    'USE_RESTORE'::point_transaction_type,
    v_desc,
    p_order_id,
    NULL,
    NULL
  );
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.restore_order_points_used(UUID, INTEGER) IS
  '주문 사용 포인트 복구. p_amount 생략 시 잔여 전액, 지정 시 그 금액(잔여 한도). idempotent.';

GRANT EXECUTE ON FUNCTION public.restore_order_points_used(UUID, INTEGER) TO service_role;
