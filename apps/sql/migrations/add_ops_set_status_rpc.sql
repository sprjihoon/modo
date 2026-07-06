-- ============================================
-- ops_set_status RPC: 운영 상태 전환 원자적 처리
-- ============================================
-- 작성일: 2026-07-06
-- 설명:
--   /api/ops/status 가 shipments 와 orders 를 각각 update 하던 것을
--   단일 트랜잭션 RPC 로 통합한다. (중간 실패 시 자동 롤백)
--   또한 현재 상태 → 목표 상태 전이 검증을 추가하여 비정상 점프를 방지한다.
--   운영 흐름:
--     INBOUND → PROCESSING → READY_TO_SHIP → OUT_FOR_DELIVERY → DELIVERED
--   되돌리기(revert) 허용:
--     OUT_FOR_DELIVERY → READY_TO_SHIP, READY_TO_SHIP → PROCESSING,
--     DELIVERED → OUT_FOR_DELIVERY

CREATE OR REPLACE FUNCTION public.ops_set_status(
  p_order_id UUID,
  p_status   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current order_status;
  v_allowed TEXT[];
BEGIN
  -- 목표 상태 유효성
  IF p_status NOT IN ('PROCESSING', 'READY_TO_SHIP', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
    RAISE EXCEPTION 'invalid target status: %', p_status;
  END IF;

  -- 현재 상태 잠금 조회
  SELECT status INTO v_current
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'order not found: %', p_order_id;
  END IF;

  -- 동일 상태면 no-op (멱등성)
  IF v_current::TEXT = p_status THEN
    RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_status, 'noop', true);
  END IF;

  -- 전이 검증
  v_allowed := CASE v_current::TEXT
    WHEN 'INBOUND'          THEN ARRAY['PROCESSING']
    WHEN 'PROCESSING'       THEN ARRAY['READY_TO_SHIP']
    WHEN 'READY_TO_SHIP'    THEN ARRAY['OUT_FOR_DELIVERY', 'PROCESSING']
    WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED', 'READY_TO_SHIP']
    WHEN 'DELIVERED'        THEN ARRAY['OUT_FOR_DELIVERY']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (p_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION '허용되지 않은 상태 전환: % → %', v_current, p_status;
  END IF;

  -- 원자적 업데이트 (shipments + orders)
  UPDATE public.shipments
  SET status = p_status::shipment_status
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET status = p_status::order_status
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_status);
END;
$$;

COMMENT ON FUNCTION public.ops_set_status(UUID, TEXT) IS
  '운영 출고 흐름 상태 전환 (shipments+orders 원자적, 전이 검증 포함)';

DO $$ BEGIN
  RAISE NOTICE '✅ ops_set_status RPC 생성 완료';
END $$;
