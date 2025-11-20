-- 기존 정책 삭제
DROP POLICY IF EXISTS "Company info is viewable by everyone" ON company_info;
DROP POLICY IF EXISTS "Company info is editable by authenticated users" ON company_info;

-- 회사 정보 테이블 (이미 있으면 생성하지 않음)
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  ceo_name TEXT NOT NULL,
  business_number TEXT NOT NULL,
  online_business_number TEXT,
  address TEXT NOT NULL,
  privacy_officer TEXT,
  email TEXT,
  phone TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 초기 데이터 삽입 (이미 있으면 무시)
INSERT INTO company_info (
  company_name,
  ceo_name,
  business_number,
  online_business_number,
  address,
  privacy_officer,
  email,
  phone
) 
SELECT 
  '(주) 의식주컴퍼니',
  '조성우',
  '561-87-00957',
  '2025-경기군포-0146호',
  '경기도 군포시 농심로72번길 3(당정동, 런드리고 글로벌 캠퍼스)',
  '최종수',
  'privacy@lifegoeson.kr',
  '1833-3429'
WHERE NOT EXISTS (SELECT 1 FROM company_info);

-- RLS 활성화
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- 새로운 정책 생성
CREATE POLICY "Company info is viewable by everyone"
ON company_info FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Company info is editable by authenticated users"
ON company_info FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

