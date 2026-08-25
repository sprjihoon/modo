-- 결제 후 수거송장이 빠진 주문을 6시간마다 다시 예약
-- 실행 전: Database > Extensions 에서 pg_cron, pg_net 활성화

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-pickup-bookings') THEN
    PERFORM cron.unschedule('reconcile-pickup-bookings');
  END IF;
END $$;

SELECT cron.schedule(
  'reconcile-pickup-bookings',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzrwediccbamxluegnex.supabase.co/functions/v1/reconcile-pickup-bookings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjQ0NSwiZXhwIjoyMDc4NTEyNDQ1fQ.L3vjKx_Ik3VrArap92KtFBCnRKo7vZ8pB1IwpmU0ao8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
