-- 회사 정보 테이블
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

-- 초기 데이터 삽입
INSERT INTO company_info (
  company_name,
  ceo_name,
  business_number,
  online_business_number,
  address,
  privacy_officer,
  email,
  phone
) VALUES (
  '(주) 의식주컴퍼니',
  '조성우',
  '561-87-00957',
  '2025-경기군포-0146호',
  '경기도 군포시 농심로72번길 3(당정동, 런드리고 글로벌 캠퍼스)',
  '최종수',
  'privacy@lifegoeson.kr',
  '1833-3429'
) ON CONFLICT DO NOTHING;

-- RLS 활성화
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록
CREATE POLICY "Company info is viewable by everyone"
ON company_info FOR SELECT
TO authenticated
USING (true);

-- 관리자만 수정 가능 (role 컬럼이 없으므로 일단 모든 인증된 사용자가 수정 가능하도록)
CREATE POLICY "Company info is editable by authenticated users"
ON company_info FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

