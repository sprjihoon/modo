-- ============================================
-- 푸터 정보 Flutter 앱 반영 문제 해결
-- ============================================
-- 문제: 관리자 페이지에서 저장한 푸터 정보가 Flutter 앱에 반영되지 않음
-- 원인: RLS 정책이 authenticated 사용자만 허용하여 anon 사용자가 읽을 수 없음
-- 해결: 모든 사용자(anon 포함)가 읽을 수 있도록 RLS 정책 수정

-- 1. header_title 컬럼 추가 (없으면)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_info' AND column_name = 'header_title'
  ) THEN
    ALTER TABLE company_info ADD COLUMN header_title TEXT;
    COMMENT ON COLUMN company_info.header_title IS '푸터 아코디언 헤더에 표시될 제목';
  END IF;
END $$;

-- 2. 기존 데이터에 header_title 설정 (없으면)
UPDATE company_info 
SET header_title = COALESCE(
  header_title,
  TRIM(SPLIT_PART(company_name, '(', 1)),
  company_name
)
WHERE header_title IS NULL;

-- 3. 기존 RLS 정책 모두 삭제
DROP POLICY IF EXISTS "Company info is viewable by everyone" ON company_info;
DROP POLICY IF EXISTS "Company info is editable by authenticated users" ON company_info;
DROP POLICY IF EXISTS "company_info_select" ON company_info;
DROP POLICY IF EXISTS "company_info_all" ON company_info;
DROP POLICY IF EXISTS "company_info_public_read" ON company_info;
DROP POLICY IF EXISTS "company_info_authenticated_write" ON company_info;

-- 4. RLS 활성화 확인
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- 5. 새로운 정책: 모든 사용자(anon 포함)가 SELECT 가능
-- 이 정책이 없으면 Flutter 앱에서 로그인하지 않은 상태로 푸터 정보를 읽을 수 없음
CREATE POLICY "company_info_public_read"
ON company_info FOR SELECT
USING (true);

-- 6. 새로운 정책: authenticated 사용자만 INSERT/UPDATE/DELETE 가능
CREATE POLICY "company_info_authenticated_write"
ON company_info FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 푸터 정보 RLS 정책이 수정되었습니다. 이제 Flutter 앱에서 로그인하지 않은 상태로도 푸터 정보를 읽을 수 있습니다.';
END $$;

