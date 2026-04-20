-- shipping_settings 쓰기 권한 정책 추가
-- 기존 RLS는 SELECT만 허용했고 쓰기는 service_role 한정이었으나,
-- admin 페이지가 브라우저(anon 키)에서 직접 upsert를 호출하므로
-- shipping_promotions와 동일한 패턴(로그인 ADMIN/MANAGER 허용)으로 정책을 추가한다.

DROP POLICY IF EXISTS "shipping_settings_admin_write" ON shipping_settings;

CREATE POLICY "shipping_settings_admin_write" ON shipping_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
        AND role IN ('ADMIN', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
        AND role IN ('ADMIN', 'MANAGER')
    )
  );
