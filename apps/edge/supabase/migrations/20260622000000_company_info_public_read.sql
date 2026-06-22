-- company_info: 비로그인(anon) 사용자도 푸터 사업자 정보를 읽을 수 있도록 RLS 수정
-- PG 심사·고객 웹 푸터에서 사업자등록번호 등이 빈 칸으로 보이는 문제 방지

DROP POLICY IF EXISTS "Company info is viewable by everyone" ON public.company_info;
DROP POLICY IF EXISTS "Company info is editable by authenticated users" ON public.company_info;
DROP POLICY IF EXISTS "company_info_select" ON public.company_info;
DROP POLICY IF EXISTS "company_info_all" ON public.company_info;
DROP POLICY IF EXISTS "company_info_public_read" ON public.company_info;
DROP POLICY IF EXISTS "company_info_authenticated_write" ON public.company_info;

ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_info_public_read"
ON public.company_info FOR SELECT
USING (true);

CREATE POLICY "company_info_authenticated_write"
ON public.company_info FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
