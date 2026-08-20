-- 앱 업데이트 안내 (플랫폼별 최신/최소 버전)
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  latest_version TEXT NOT NULL,
  min_version TEXT NOT NULL,
  store_url TEXT NOT NULL,
  update_message TEXT DEFAULT '새로운 기능이 추가되었습니다. 업데이트해 주세요!',
  update_message_en TEXT DEFAULT 'New features have been added. Please update!',
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform)
);

CREATE OR REPLACE FUNCTION update_app_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_versions_updated_at ON app_versions;
CREATE TRIGGER trigger_update_app_versions_updated_at
  BEFORE UPDATE ON app_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_versions_updated_at();

ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app versions" ON app_versions;
CREATE POLICY "Anyone can read app versions" ON app_versions
  FOR SELECT USING (true);

GRANT SELECT ON app_versions TO anon, authenticated;

INSERT INTO app_versions (platform, latest_version, min_version, store_url, update_message)
VALUES
  (
    'android',
    '1.0.1',
    '1.0.0',
    'https://play.google.com/store/apps/details?id=com.modurepair.app',
    '새로운 기능이 추가되었습니다. 업데이트해 주세요!'
  ),
  (
    'ios',
    '1.0',
    '1.0.0',
    'https://apps.apple.com/kr/app/id6759492888',
    '새로운 기능이 추가되었습니다. 업데이트해 주세요!'
  )
ON CONFLICT (platform) DO UPDATE SET
  store_url = EXCLUDED.store_url
WHERE app_versions.store_url LIKE '%YOUR_%';
