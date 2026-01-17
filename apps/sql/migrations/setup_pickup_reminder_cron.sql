-- ============================================
-- 수거일 알림 Cron Job 설정
-- ============================================
-- 작성일: 2026-01-17
-- 설명: 매일 아침 9시에 수거일 알림을 발송하는 Cron Job 설정
-- 
-- 사전 조건:
-- 1. Supabase Dashboard → Database → Extensions → pg_cron 활성화
-- 2. Supabase Dashboard → Database → Extensions → pg_net 활성화

-- 1. pg_cron 확장 활성화 (이미 활성화되어 있으면 무시됨)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. pg_net 확장 활성화 (Edge Function 호출용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Supabase 프로젝트 URL 및 서비스 키 (환경에 맞게 수정 필요)
-- ⚠️ 실제 배포 시 아래 값들을 환경에 맞게 변경하세요
DO $$
DECLARE
  v_supabase_url TEXT := 'https://rzrwediccbamxluegnex.supabase.co';
  v_service_role_key TEXT := ''; -- Supabase Dashboard → Settings → API에서 확인
BEGIN
  RAISE NOTICE '📋 Cron Job 설정 안내:';
  RAISE NOTICE '   - 프로젝트 URL: %', v_supabase_url;
  RAISE NOTICE '   - Service Role Key는 Dashboard에서 확인하세요';
END $$;

-- 4. 수거일 알림 발송 함수 (pg_net을 통해 Edge Function 호출)
CREATE OR REPLACE FUNCTION invoke_pickup_reminders()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- 환경변수에서 값 가져오기 (Vault 사용 시)
  -- v_supabase_url := current_setting('app.supabase_url', true);
  -- v_service_role_key := current_setting('app.service_role_key', true);
  
  -- 또는 직접 지정 (⚠️ 실제 값으로 변경 필요)
  v_supabase_url := 'https://rzrwediccbamxluegnex.supabase.co';
  
  -- Service Role Key는 Supabase Vault에 저장하는 것을 권장
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
  
  -- Edge Function 호출
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-pickup-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('type', 'ALL')
  ) INTO v_request_id;
  
  RAISE NOTICE '✅ 수거일 알림 Edge Function 호출됨 (request_id: %)', v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cron Job 스케줄 설정
-- 매일 아침 9시 (한국 시간 기준, UTC+9이므로 UTC 00:00)
-- Supabase는 UTC 기준이므로 한국 시간 09:00 = UTC 00:00

-- 기존 Cron Job이 있으면 삭제
SELECT cron.unschedule('send-pickup-reminders-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-pickup-reminders-daily'
);

-- 새 Cron Job 생성
-- 매일 UTC 00:00 (한국 시간 09:00)에 실행
SELECT cron.schedule(
  'send-pickup-reminders-daily',  -- Job 이름
  '0 0 * * *',                     -- Cron 표현식: 매일 00:00 UTC (한국 09:00)
  $$ SELECT invoke_pickup_reminders(); $$
);

-- 6. Cron Job 확인
DO $$
BEGIN
  RAISE NOTICE '✅ 수거일 알림 Cron Job 설정 완료';
  RAISE NOTICE '   - Job 이름: send-pickup-reminders-daily';
  RAISE NOTICE '   - 실행 시간: 매일 09:00 (한국 시간)';
  RAISE NOTICE '   - Edge Function: send-pickup-reminders';
END $$;

-- Cron Job 목록 조회 (확인용)
-- SELECT * FROM cron.job WHERE jobname = 'send-pickup-reminders-daily';

-- Cron Job 실행 이력 조회 (확인용)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- 수동 테스트 방법
-- ============================================
-- 1. 직접 함수 호출:
--    SELECT invoke_pickup_reminders();
--
-- 2. Edge Function 직접 호출 (curl):
--    curl -X POST \
--      'https://rzrwediccbamxluegnex.supabase.co/functions/v1/send-pickup-reminders' \
--      -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
--      -H 'Content-Type: application/json' \
--      -d '{"type": "ALL"}'
--
-- 3. D-1 알림만 테스트:
--    -d '{"type": "D-1"}'
--
-- 4. 당일 알림만 테스트:
--    -d '{"type": "TODAY"}'

