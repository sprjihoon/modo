-- 신규 결제 주문 / 신규 가입 시 운영 알림 메일 (Edge send-ops-alert)

CREATE OR REPLACE FUNCTION public.invoke_ops_alert(p_body JSONB)
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
    url := v_url || '/functions/v1/send-ops-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := COALESCE(p_body, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ops_new_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'PAID' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS NOT DISTINCT FROM 'PAID' THEN
    RETURN NEW;
  END IF;
  PERFORM public.invoke_ops_alert(jsonb_build_object('type', 'order', 'orderId', NEW.id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ops_new_paid_order failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ops_alert_paid_order ON public.orders;
CREATE TRIGGER trigger_ops_alert_paid_order
  AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ops_new_paid_order();

CREATE OR REPLACE FUNCTION public.notify_ops_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'CUSTOMER' THEN
    RETURN NEW;
  END IF;
  PERFORM public.invoke_ops_alert(jsonb_build_object('type', 'signup', 'userId', NEW.id));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_ops_new_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ops_alert_signup ON public.users;
CREATE TRIGGER trigger_ops_alert_signup
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ops_new_signup();
