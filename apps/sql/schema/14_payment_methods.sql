-- 결제수단 테이블 (빌링키 저장)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,
  card_company TEXT NOT NULL,
  card_number TEXT NOT NULL, -- 마스킹된 카드번호 (예: **** **** **** 1234)
  card_type TEXT DEFAULT '신용', -- 신용/체크
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(user_id, billing_key)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- RLS 활성화
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- 자신의 결제수단만 볼 수 있음
CREATE POLICY "Users can view their own payment methods"
ON payment_methods FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 자신의 결제수단만 추가 가능
CREATE POLICY "Users can insert their own payment methods"
ON payment_methods FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 자신의 결제수단만 수정 가능
CREATE POLICY "Users can update their own payment methods"
ON payment_methods FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 자신의 결제수단만 삭제 가능
CREATE POLICY "Users can delete their own payment methods"
ON payment_methods FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

