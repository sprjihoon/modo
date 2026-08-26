-- 운영 모니터 리포트 일자별 스냅샷

CREATE TABLE IF NOT EXISTS public.ops_daily_reports (
  report_date DATE PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  generated_by TEXT
);

COMMENT ON TABLE public.ops_daily_reports IS '운영 모니터 리포트 일자별 스냅샷 (KST 하루)';

ALTER TABLE public.ops_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_daily_reports_admin_read" ON public.ops_daily_reports;
CREATE POLICY "ops_daily_reports_admin_read"
  ON public.ops_daily_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

GRANT SELECT ON public.ops_daily_reports TO authenticated;
GRANT ALL ON public.ops_daily_reports TO service_role;
