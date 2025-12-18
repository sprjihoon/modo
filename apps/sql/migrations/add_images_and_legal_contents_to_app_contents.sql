-- =====================================================
-- 앱 콘텐츠 확장: 이미지 필드 및 약관/개인정보 항목 추가
-- =====================================================

-- 1. images 컬럼 추가 (이미지 URL 배열)
ALTER TABLE app_contents
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. 이용약관 / 개인정보처리방침 기본 레코드 추가
INSERT INTO app_contents (key, title, content)
VALUES
  ('terms_of_service', '이용약관', '서비스 이용약관 내용을 입력해주세요.'),
  ('privacy_policy', '개인정보처리방침', '개인정보처리방침 내용을 입력해주세요.')
ON CONFLICT (key) DO NOTHING;


