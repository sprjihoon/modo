-- =====================================================
-- 앱 콘텐츠 테이블 (가격표, 쉬운가이드 등)
-- =====================================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS app_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_app_contents_key ON app_contents(key);

-- 3. RLS 활성화
ALTER TABLE app_contents ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 - 누구나 읽기 가능
CREATE POLICY "Anyone can read app_contents"
  ON app_contents
  FOR SELECT
  USING (true);

-- 5. RLS 정책 - 관리자만 수정 가능
CREATE POLICY "Admins can manage app_contents"
  ON app_contents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- 6. updated_at 트리거
CREATE OR REPLACE FUNCTION update_app_contents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_app_contents_updated_at ON app_contents;
CREATE TRIGGER set_app_contents_updated_at
  BEFORE UPDATE ON app_contents
  FOR EACH ROW
  EXECUTE FUNCTION update_app_contents_updated_at();

-- 7. 초기 데이터 삽입
INSERT INTO app_contents (key, title, content) VALUES
  ('price_list', '가격표', '가격표 내용을 입력해주세요.'),
  ('easy_guide', '쉬운가이드', '쉬운가이드 내용을 입력해주세요.')
ON CONFLICT (key) DO NOTHING;

-- 8. 서비스 롤에 권한 부여
GRANT ALL ON app_contents TO service_role;
GRANT SELECT ON app_contents TO anon;
GRANT SELECT ON app_contents TO authenticated;

