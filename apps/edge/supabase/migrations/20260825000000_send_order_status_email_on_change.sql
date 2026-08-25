-- 주문 상태 변경 → 푸시 + Resend 이메일
-- 운영 DB에는 notification_events / 트리거가 없어 여기서 함께 만든다.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  fcm_token TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_sent
  ON public.notification_events(notification_sent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_order_id
  ON public.notification_events(order_id);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.create_notification_event(
  p_order_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_old_status TEXT,
  p_new_status TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_fcm_token TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT fcm_token INTO v_fcm_token
  FROM public.users
  WHERE id = p_user_id;

  INSERT INTO public.notification_events (
    order_id, user_id, event_type, old_status, new_status,
    fcm_token, notification_sent, error_message
  ) VALUES (
    p_order_id, p_user_id, p_event_type, p_old_status, p_new_status,
    v_fcm_token, FALSE,
    CASE WHEN v_fcm_token IS NULL THEN 'FCM token not found' ELSE NULL END
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id UUID,
  p_order_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id, order_id, type, title, body
  ) VALUES (
    p_user_id, p_order_id, p_type, p_title, p_body
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_order_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg JSONB;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status::TEXT <> 'CANCELLED' THEN
    v_msg := get_notification_message(NEW.status::TEXT, NEW.order_number);
    v_title := v_msg->>'title';
    v_body := v_msg->>'body';

    PERFORM create_notification_event(
      NEW.id, NEW.user_id, 'order_status_changed',
      OLD.status::TEXT, NEW.status::TEXT
    );
    PERFORM create_user_notification(
      NEW.user_id, NEW.id, 'order_status',
      COALESCE(v_title, '주문 상태 변경'),
      COALESCE(v_body, '주문 상태가 변경되었습니다.')
    );
  END IF;

  IF OLD.extra_charge_status IS DISTINCT FROM NEW.extra_charge_status
     AND NEW.extra_charge_status IN ('PENDING_CUSTOMER', 'COMPLETED', 'SKIPPED', 'RETURN_REQUESTED') THEN
    v_msg := get_extra_charge_notification_message(
      NEW.extra_charge_status::TEXT,
      NEW.order_number,
      (NEW.extra_charge_data->>'managerPrice')::INTEGER
    );
    v_title := v_msg->>'title';
    v_body := v_msg->>'body';

    PERFORM create_notification_event(
      NEW.id, NEW.user_id, 'extra_charge_status_changed',
      OLD.extra_charge_status::TEXT, NEW.extra_charge_status::TEXT
    );
    PERFORM create_user_notification(
      NEW.user_id, NEW.id, 'extra_charge',
      COALESCE(v_title, '추가 결제 알림'),
      COALESCE(v_body, '추가 결제 관련 업데이트가 있습니다.')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_status_changed ON public.orders;
CREATE TRIGGER trigger_order_status_changed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION on_order_status_changed();

CREATE OR REPLACE FUNCTION public.on_order_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg JSONB;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status::TEXT IN ('PAID', 'BOOKED') THEN
    v_msg := get_notification_message(NEW.status::TEXT, NEW.order_number);
    PERFORM create_notification_event(
      NEW.id, NEW.user_id, 'order_status_changed', NULL, NEW.status::TEXT
    );
    PERFORM create_user_notification(
      NEW.user_id, NEW.id, 'order_status',
      COALESCE(v_msg->>'title', '주문 접수'),
      COALESCE(v_msg->>'body', '주문이 접수되었습니다.')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_created_notify ON public.orders;
CREATE TRIGGER trigger_order_created_notify
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION on_order_created_notify();

CREATE OR REPLACE FUNCTION public.invoke_pending_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := 'https://rzrwediccbamxluegnex.supabase.co';
  v_key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  IF v_key IS NULL OR length(trim(v_key)) = 0 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/process-pending-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.on_notification_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.notification_sent IS NOT TRUE THEN
    PERFORM public.invoke_pending_notifications();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notification_event_created ON public.notification_events;
CREATE TRIGGER trigger_notification_event_created
  AFTER INSERT ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION on_notification_event_created();
