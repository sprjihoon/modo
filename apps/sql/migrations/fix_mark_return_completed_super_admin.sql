-- ============================================
-- mark_return_completed RPC 수정
-- ============================================
-- 원인: user_role ENUM에 SUPER_ADMIN이 없어서
--        `v_actor.role NOT IN ('SUPER_ADMIN', ...)` 비교 시
--        "invalid input value for enum user_role: 'SUPER_ADMIN'" 에러 발생
-- 해결: role을 TEXT로 캐스팅하여 비교

CREATE OR REPLACE FUNCTION public.mark_return_completed(
  p_order_id UUID,
  p_actor_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_actor RECORD;
  v_extra JSONB;
BEGIN
  -- 권한 체크: 액터가 ADMIN/SUPER_ADMIN/MANAGER 인지
  -- role::TEXT 로 캐스팅해야 user_role ENUM에 없는 'SUPER_ADMIN' 비교 에러 방지
  SELECT id, role::TEXT AS role, name INTO v_actor FROM public.users WHERE id = p_actor_id;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION '처리자 정보를 찾을 수 없습니다.';
  END IF;
  IF v_actor.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER') THEN
    RAISE EXCEPTION '반송 완료 처리 권한이 없습니다 (현재 역할: %)', v_actor.role;
  END IF;

  SELECT id, status, extra_charge_status, extra_charge_data, user_id, item_name, order_number
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION '주문을 찾을 수 없습니다.';
  END IF;

  -- 이미 RETURN_DONE 이면 idempotent 하게 OK 반환
  IF v_order.status = 'RETURN_DONE' THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyDone', true,
      'status', 'RETURN_DONE'
    );
  END IF;

  -- 반송 흐름이 아니면 거부
  IF v_order.status NOT IN ('RETURN_PENDING', 'RETURN_SHIPPING')
     AND COALESCE(v_order.extra_charge_status::TEXT, '') <> 'RETURN_REQUESTED'
  THEN
    RAISE EXCEPTION '반송 흐름이 아닌 주문입니다 (status=%, extra=%)',
      v_order.status, v_order.extra_charge_status;
  END IF;

  v_extra := COALESCE(v_order.extra_charge_data, '{}'::jsonb)
    || jsonb_build_object(
      'returnCompletedAt', NOW(),
      'returnCompletedBy', p_actor_id::TEXT,
      'returnCompletedByName', v_actor.name,
      'returnCompletionNote', COALESCE(p_note, '')
    );

  UPDATE public.orders
    SET status = 'RETURN_DONE',
        extra_charge_data = v_extra,
        updated_at = NOW()
    WHERE id = p_order_id;

  -- 액션 로그
  BEGIN
    INSERT INTO public.action_logs(actor_id, action_type, details)
    VALUES (
      p_actor_id,
      'RETURN_COMPLETED',
      jsonb_build_object(
        'orderId', p_order_id,
        'orderNumber', v_order.order_number,
        'note', COALESCE(p_note, '')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'RETURN_DONE',
    'orderId', p_order_id,
    'orderNumber', v_order.order_number
  );
END;
$$;

COMMENT ON FUNCTION public.mark_return_completed(UUID, UUID, TEXT) IS
  '관리자/매니저가 반송 처리 완료를 표시. status -> RETURN_DONE, extra_charge_data 에 완료 기록.';

GRANT EXECUTE ON FUNCTION public.mark_return_completed TO authenticated;

DO $$ BEGIN
  RAISE NOTICE '✅ mark_return_completed RPC 수정 완료 (SUPER_ADMIN 비교 오류 해결)';
END $$;
