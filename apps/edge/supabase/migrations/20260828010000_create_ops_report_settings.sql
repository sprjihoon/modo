-- 운영 리포트 자동 발송 시각 (KST). 기본 매일 09:00
CREATE TABLE IF NOT EXISTS public.ops_report_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  send_hour SMALLINT NOT NULL DEFAULT 9 CHECK (send_hour >= 0 AND send_hour <= 23),
  send_minute SMALLINT NOT NULL DEFAULT 0 CHECK (send_minute >= 0 AND send_minute <= 59),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

COMMENT ON TABLE public.ops_report_settings IS '운영 리포트 아침 메일 시각 (KST). 그 시각에 전날을 다시 집계해 발송';

INSERT INTO public.ops_report_settings (id, enabled, send_hour, send_minute)
VALUES (1, TRUE, 9, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ops_report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_report_settings_admin_read" ON public.ops_report_settings;
CREATE POLICY "ops_report_settings_admin_read"
  ON public.ops_report_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

GRANT SELECT ON public.ops_report_settings TO authenticated;
GRANT ALL ON public.ops_report_settings TO service_role;
