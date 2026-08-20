-- 앱 버전 관리 (업데이트 알림). 정식 마이그레이션:
-- supabase/migrations/20260820000001_create_app_versions.sql
-- 이 파일은 참고용. 신규 적용은 supabase/migrations 쪽을 쓴다.

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
