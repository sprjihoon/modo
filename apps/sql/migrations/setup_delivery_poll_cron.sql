-- 배송 자동 폴링 Cron Job 설정
-- OUT_FOR_DELIVERY 주문을 30분마다 자동 추적하여 DELIVERED로 업데이트
-- 
-- 실행 전: Supabase 대시보드 > Database > Extensions에서 pg_cron, pg_net 활성화 필요

-- 기존 동일 이름 job 제거 (있으면)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'poll-delivery-tracking') THEN
    PERFORM cron.unschedule('poll-delivery-tracking');
  END IF;
END $$;

-- 30분마다 poll-delivery-tracking 엣지함수 호출
SELECT cron.schedule(
  'poll-delivery-tracking',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzrwediccbamxluegnex.supabase.co/functions/v1/poll-delivery-tracking',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cndlZGljY2JhbXhsdWVnbmV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjQ0NSwiZXhwIjoyMDc4NTEyNDQ1fQ.L3vjKx_Ik3VrArap92KtFBCnRKo7vZ8pB1IwpmU0ao8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
