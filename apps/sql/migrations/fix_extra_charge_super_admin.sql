-- SUPER_ADMIN 역할을 request_extra_charge RPC에 추가
-- 기존 RPC는 MANAGER/ADMIN만 처리하고 SUPER_ADMIN은 권한 없음 오류 발생

CREATE OR REPLACE FUNCTION request_extra_charge(
  p_order_id UUID,
  p_user_id UUID,
  p_memo TEXT,
  p_price INTEGER DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_role TEXT;
  v_order_status TEXT;
  v_result JSONB;
  v_extra_data JSONB;
BEGIN
  SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
  IF v_user_role IS NULL THEN RAISE EXCEPTION '사용자를 찾을 수 없습니다'; END IF;

  SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id;
  IF v_order_status IS NULL THEN RAISE EXCEPTION '주문을 찾을 수 없습니다'; END IF;

  -- 작업자(WORKER): 사유만 입력 → PENDING_MANAGER
  IF v_user_role = 'WORKER' THEN
    v_extra_data := jsonb_build_object(
      'workerMemo', p_memo,
      'requestedAt', NOW(),
      'requestedBy', p_user_id
    );
    UPDATE public.orders
    SET extra_charge_status = 'PENDING_MANAGER', extra_charge_data = v_extra_data, status = 'HOLD', updated_at = NOW()
    WHERE id = p_order_id;
    v_result := jsonb_build_object('success', true, 'message', '관리자 승인 대기 중', 'status', 'PENDING_MANAGER');

  -- 관리자(MANAGER/ADMIN/SUPER_ADMIN): 금액 포함 → PENDING_CUSTOMER (Direct Pass)
  ELSIF v_user_role IN ('MANAGER', 'ADMIN', 'SUPER_ADMIN') THEN
    IF p_price IS NULL THEN RAISE EXCEPTION '관리자는 금액을 입력해야 합니다'; END IF;
    v_extra_data := jsonb_build_object(
      'workerMemo', p_memo,
      'managerPrice', p_price,
      'managerNote', COALESCE(p_note, ''),
      'requestedAt', NOW(),
      'requestedBy', p_user_id,
      'approvedAt', NOW(),
      'approvedBy', p_user_id
    );
    UPDATE public.orders
    SET extra_charge_status = 'PENDING_CUSTOMER', extra_charge_data = v_extra_data, status = 'HOLD', updated_at = NOW()
    WHERE id = p_order_id;
    v_result := jsonb_build_object('success', true, 'message', '고객 결제 대기 중 (Direct Pass)', 'status', 'PENDING_CUSTOMER');

  ELSE
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
