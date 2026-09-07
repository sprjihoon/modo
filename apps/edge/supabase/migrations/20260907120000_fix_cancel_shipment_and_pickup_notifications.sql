-- 수거 취소 후 송장이 BOOKED로 남아 당일 수거 알림이 다시 나가던 문제 수정
-- 1) shipment_status에 CANCELLED 추가
-- 2) 수거 알림 대상 조회에서 취소 주문 제외
-- 3) 주문 취소 시 수거 관련 알림만 삭제 (취소 안내 알림은 유지)

ALTER TYPE public.shipment_status ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE OR REPLACE FUNCTION get_pickup_reminders_for_date(target_date DATE)
RETURNS TABLE (
  shipment_id UUID,
  order_id UUID,
  user_id UUID,
  tracking_no TEXT,
  pickup_scheduled_date DATE,
  customer_name TEXT,
  pickup_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as shipment_id,
    s.order_id,
    o.user_id,
    s.tracking_no,
    s.pickup_scheduled_date,
    s.customer_name,
    s.pickup_address
  FROM public.shipments s
  JOIN public.orders o ON s.order_id = o.id
  WHERE s.pickup_scheduled_date = target_date
    AND s.status = 'BOOKED'
    AND o.status NOT IN ('CANCELLED', 'RETURN_PENDING', 'RETURN_SHIPPING', 'RETURN_DONE')
    AND s.pickup_reminder_sent_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_pickup_day_reminders_for_date(target_date DATE)
RETURNS TABLE (
  shipment_id UUID,
  order_id UUID,
  user_id UUID,
  tracking_no TEXT,
  pickup_scheduled_date DATE,
  customer_name TEXT,
  pickup_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as shipment_id,
    s.order_id,
    o.user_id,
    s.tracking_no,
    s.pickup_scheduled_date,
    s.customer_name,
    s.pickup_address
  FROM public.shipments s
  JOIN public.orders o ON s.order_id = o.id
  WHERE s.pickup_scheduled_date = target_date
    AND s.status = 'BOOKED'
    AND o.status NOT IN ('CANCELLED', 'RETURN_PENDING', 'RETURN_SHIPPING', 'RETURN_DONE')
    AND s.pickup_day_reminder_sent_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_notifications_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status <> 'CANCELLED') THEN
    DELETE FROM public.notifications
    WHERE order_id = NEW.id
      AND type IN (
        'pickup_today',
        'pickup_reminder',
        'pickup_reminder_d1',
        'pickup_reminder_today',
        'SHIPMENT_BOOKED'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_notifications_on_order_cancel() IS
  '주문 취소 시 수거 예약/당일 알림만 삭제한다. 취소 안내 알림은 유지.';
