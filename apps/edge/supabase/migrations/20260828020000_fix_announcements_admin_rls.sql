-- 공지/템플릿 관리 RLS에 SUPER_ADMIN 누락 보완
-- 고객 조회 정책(status = 'sent')은 그대로 둔다.

DROP POLICY IF EXISTS "Admins can manage all announcements" ON public.announcements;
CREATE POLICY "Admins can manage all announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all templates" ON public.notification_templates;
CREATE POLICY "Admins can manage all templates"
  ON public.notification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    )
  );

CREATE OR REPLACE FUNCTION get_all_fcm_tokens(
  p_target_audience TEXT DEFAULT 'all'
) RETURNS TABLE (
  user_id UUID,
  fcm_token TEXT,
  email TEXT
) AS $$
BEGIN
  CASE p_target_audience
    WHEN 'all' THEN
      RETURN QUERY
      SELECT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WORKER');

    WHEN 'active_users' THEN
      RETURN QUERY
      SELECT DISTINCT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WORKER')
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.user_id = u.id
            AND o.created_at >= NOW() - INTERVAL '30 days'
        );

    WHEN 'recent_orders' THEN
      RETURN QUERY
      SELECT DISTINCT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WORKER')
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.user_id = u.id
            AND o.created_at >= NOW() - INTERVAL '7 days'
        );

    ELSE
      RETURN QUERY
      SELECT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WORKER');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
