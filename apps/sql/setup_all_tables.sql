-- 전체 테이블 설정 스크립트
-- Supabase SQL Editor에서 전체 복사하여 한 번에 실행

-- 1. company_info 테이블
DROP TABLE IF EXISTS company_info CASCADE;
CREATE TABLE company_info (
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

-- 초기 데이터
INSERT INTO company_info (
  company_name, ceo_name, business_number, online_business_number,
  address, privacy_officer, email, phone
) VALUES (
  '모두의수선', '장지훈', '766-55-00323', '2025-경기군포-0146호',
  '대구시 동구 안심로188 2층 3층',
  '장지훈', 'info@tillion.kr', '010-2723-9490'
);

ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_info_select" ON company_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_info_all" ON company_info FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. payment_methods 테이블
DROP TABLE IF EXISTS payment_methods CASCADE;
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  card_company TEXT NOT NULL,
  card_number TEXT NOT NULL,
  card_type TEXT DEFAULT '신용',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, billing_key)
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_default = true;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE TO authenticated USING (auth.uid() = user_id);

