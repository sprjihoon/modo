-- company_info RLS 정책 수정
-- 푸터 정보는 공개 정보이므로 모든 사용자(anon 포함)가 읽을 수 있어야 함
-- 수정은 authenticated 사용자만 가능

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Company info is viewable by everyone" ON company_info;
DROP POLICY IF EXISTS "Company info is editable by authenticated users" ON company_info;
DROP POLICY IF EXISTS "company_info_select" ON company_info;
DROP POLICY IF EXISTS "company_info_all" ON company_info;

-- RLS 활성화 확인
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- 새로운 정책: 모든 사용자(anon 포함)가 SELECT 가능
CREATE POLICY "company_info_public_read"
ON company_info FOR SELECT
USING (true);

-- 새로운 정책: authenticated 사용자만 INSERT/UPDATE/DELETE 가능
CREATE POLICY "company_info_authenticated_write"
ON company_info FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

