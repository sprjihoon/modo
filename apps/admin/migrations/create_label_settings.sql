-- label_settings 테이블 생성
-- 배경 이미지 등 레이블 에디터 설정을 저장하는 테이블

CREATE TABLE IF NOT EXISTS label_settings (
  setting_key TEXT PRIMARY KEY,
  background_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_label_settings_key ON label_settings(setting_key);

-- RLS 정책 (필요시)
ALTER TABLE label_settings ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정 (service_role은 RLS 우회)
CREATE POLICY "Admin only" ON label_settings
  FOR ALL
  USING (auth.role() = 'service_role');

