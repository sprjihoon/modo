-- ============================================
-- 취소/반송 관리 통합 마이그레이션
-- ============================================
-- 작성일: 2026-04-27
-- 설명:
--   1. order_status에 RETURN_SHIPPING, RETURN_DONE 추가
--      (RETURN_PENDING -> RETURN_SHIPPING -> RETURN_DONE 흐름)
--   2. 반송 완료 처리 RPC 신설 (관리자/매니저 대상)
--   3. 반송 진행/완료 알림 템플릿 추가
--   4. 관리자 콘솔/센터 콘솔에서 빠르게 카운트 조회용 view 추가

-- 1. order_status에 RETURN_SHIPPING (반송 송장 발급 후 배송중) 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'RETURN_SHIPPING'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'RETURN_SHIPPING' AFTER 'RETURN_PENDING';
    RAISE NOTICE '✅ order_status에 RETURN_SHIPPING 추가';
  ELSE
    RAISE NOTICE '⚠️ RETURN_SHIPPING 이미 존재';
  END IF;
END $$;

-- 2. order_status에 RETURN_DONE (반송 완료) 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'RETURN_DONE'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'RETURN_DONE' AFTER 'RETURN_SHIPPING';
    RAISE NOTICE '✅ order_status에 RETURN_DONE 추가';
  ELSE
    RAISE NOTICE '⚠️ RETURN_DONE 이미 존재';
  END IF;
END $$;

-- 3. 반송/취소 알림 템플릿
INSERT INTO public.notification_templates
  (template_key, template_name, category, title, body, is_default, variables)
VALUES
  ('order_return_shipping', '반송 배송 시작', 'order_status', '반송 배송 시작',
   '주문({{order_number}})의 반송 송장이 발급되어 의류가 고객님께 다시 배송됩니다.',
   TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
  ('order_return_done', '반송 처리 완료', 'order_status', '반송 처리 완료',
   '주문({{order_number}})의 반송 처리가 완료되었습니다. 환불 진행 사항은 마이페이지에서 확인해 주세요.',
   TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
  ('admin_cancel_request', '취소/반송 요청 접수', 'admin_alert',
   '취소/반송 요청 접수',
   '''{{item_name}}'' (주문 {{order_number}}) 의 {{action}} 요청이 접수되었습니다. 처리해 주세요.',
   TRUE,
   '[{"name": "item_name", "description": "의류명"}, {"name": "order_number", "description": "주문 번호"}, {"name": "action", "description": "취소/반송"}]'::jsonb),
  ('admin_return_done', '반송 처리 완료(관리자)', 'admin_alert',
   '반송 처리 완료',
   '''{{item_name}}'' (주문 {{order_number}}) 의 반송이 {{actor_name}}에 의해 완료 처리되었습니다.',
   TRUE,
   '[{"name": "item_name", "description": "의류명"}, {"name": "order_number", "description": "주문 번호"}, {"name": "actor_name", "description": "처리자"}]'::jsonb)
ON CONFLICT (template_key) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- 4. 반송 완료 처리 RPC (관리자/매니저용)
--    - status = RETURN_DONE 으로 전이
--    - extra_charge_status (있는 경우) 도 보존
--    - extra_charge_data 에 returnCompletedAt, returnCompletedBy 기록
--    - 처리 결과 jsonb 반환
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
  SELECT id, role, name INTO v_actor FROM public.users WHERE id = p_actor_id;
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
    /* action_logs 미존재 환경에서는 무시 */
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

-- 5. 취소/반송 작업 큐 view
--    관리자/센터 콘솔이 한 번의 쿼리로 "처리 대기" 건만 빠르게 조회.
--    - 수거 전 취소(CANCELLED) 도 환불/장부 정리가 필요할 수 있어 포함하되,
--      관리자 측 노출은 status NOT IN (DELIVERED, RETURN_DONE) 등으로 제한 가능.
CREATE OR REPLACE VIEW public.cancellation_queue AS
SELECT
  o.id,
  o.order_number,
  o.user_id,
  o.customer_name,
  o.customer_email,
  o.item_name,
  o.clothing_type,
  o.repair_type,
  o.status,
  o.payment_status,
  o.extra_charge_status,
  o.extra_charge_data,
  o.tracking_no,
  o.total_price,
  o.canceled_at,
  o.cancellation_reason,
  o.created_at,
  o.updated_at,
  CASE
    WHEN o.status = 'CANCELLED' THEN 'PRE_PICKUP_CANCEL'
    WHEN o.status = 'RETURN_PENDING' THEN 'RETURN_PENDING'
    WHEN o.status = 'RETURN_SHIPPING' THEN 'RETURN_SHIPPING'
    WHEN o.status = 'RETURN_DONE' THEN 'RETURN_DONE'
    WHEN o.extra_charge_status = 'RETURN_REQUESTED' THEN 'RETURN_REQUESTED'
    ELSE 'OTHER'
  END AS queue_kind
FROM public.orders o
WHERE o.status IN ('CANCELLED', 'RETURN_PENDING', 'RETURN_SHIPPING', 'RETURN_DONE')
   OR o.extra_charge_status = 'RETURN_REQUESTED';

GRANT SELECT ON public.cancellation_queue TO authenticated;

-- 완료 로그
DO $$ BEGIN
  RAISE NOTICE '✅ 취소/반송 관리 마이그레이션 완료';
  RAISE NOTICE '   - order_status: RETURN_SHIPPING, RETURN_DONE 추가';
  RAISE NOTICE '   - 알림 템플릿 4종 upsert';
  RAISE NOTICE '   - mark_return_completed RPC 생성';
  RAISE NOTICE '   - cancellation_queue view 생성';
END $$;
