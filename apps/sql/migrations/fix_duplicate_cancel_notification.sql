-- ============================================
-- 주문 취소 알림 중복 발송 수정
-- ============================================
-- 작성일: 2026-07-07
-- 원인: orders.status = 'CANCELLED' 변경 시
--   ① DB 트리거(on_order_status_changed) → notifications 1건
--   ② /api/pay/cancel route.ts 수동 insert  → notifications 1건
--   => 고객에게 동일 내용 알림 2회 발송
--
-- 수정 방향:
--   route.ts 수동 발송 메시지가 환불 금액을 포함하여 더 정확하므로,
--   트리거에서 CANCELLED 상태 전환 시 notifications / notification_events
--   생성을 건너뜁니다. (수동 발송 쪽에서 단독으로 처리)

CREATE OR REPLACE FUNCTION on_order_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_msg   JSONB;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  -- status가 변경되었을 때만
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- CANCELLED 는 /api/pay/cancel 이 직접 알림을 발송하므로 트리거에서 생략
    IF NEW.status != 'CANCELLED' THEN
      v_msg   := get_notification_message(NEW.status::TEXT, NEW.order_number);
      v_title := v_msg->>'title';
      v_body  := v_msg->>'body';

      -- notification_events 기록 (FCM cron용)
      PERFORM create_notification_event(
        NEW.id,
        NEW.user_id,
        'order_status_changed',
        OLD.status::TEXT,
        NEW.status::TEXT
      );

      -- notifications 테이블 (앱 인앱 알림)
      PERFORM create_user_notification(
        NEW.user_id,
        NEW.id,
        'order_status',
        COALESCE(v_title, '주문 상태 변경'),
        COALESCE(v_body, '주문 상태가 변경되었습니다.')
      );
    END IF;

  END IF;

  -- extra_charge_status가 변경되었을 때
  IF OLD.extra_charge_status IS DISTINCT FROM NEW.extra_charge_status THEN
    IF NEW.extra_charge_status IN ('PENDING_CUSTOMER', 'COMPLETED', 'SKIPPED', 'RETURN_REQUESTED') THEN
      v_msg   := get_extra_charge_notification_message(
        NEW.extra_charge_status::TEXT,
        NEW.order_number,
        (NEW.extra_charge_data->>'managerPrice')::INTEGER
      );
      v_title := v_msg->>'title';
      v_body  := v_msg->>'body';

      PERFORM create_notification_event(
        NEW.id,
        NEW.user_id,
        'extra_charge_status_changed',
        OLD.extra_charge_status::TEXT,
        NEW.extra_charge_status::TEXT
      );

      PERFORM create_user_notification(
        NEW.user_id,
        NEW.id,
        'extra_charge',
        COALESCE(v_title, '추가 결제 알림'),
        COALESCE(v_body, '추가 결제 관련 업데이트가 있습니다.')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE '✅ on_order_status_changed 트리거 수정 완료';
  RAISE NOTICE '   - CANCELLED 상태 전환 시 트리거 알림 생략';
  RAISE NOTICE '   - /api/pay/cancel 에서 단독으로 취소 알림 발송';
END $$;
