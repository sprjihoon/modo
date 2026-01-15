-- ============================================
-- 모두의수선 - 배송지 테이블
-- ============================================

-- 배송지 테이블
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 사용자 연결
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 배송지 정보
  label TEXT, -- 별칭 (예: 집, 회사, 기타)
  recipient_name TEXT NOT NULL, -- 수령인 이름
  recipient_phone TEXT NOT NULL, -- 수령인 전화번호
  
  -- 주소
  zipcode TEXT NOT NULL, -- 우편번호
  address TEXT NOT NULL, -- 기본 주소
  address_detail TEXT, -- 상세 주소
  
  -- 기본 배송지 여부
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 배송지만 조회 가능
CREATE POLICY "Users can view own addresses"
  ON public.addresses
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 배송지 추가 가능
CREATE POLICY "Users can insert own addresses"
  ON public.addresses
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 배송지 수정 가능
CREATE POLICY "Users can update own addresses"
  ON public.addresses
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 배송지 삭제 가능
CREATE POLICY "Users can delete own addresses"
  ON public.addresses
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 관리자는 모든 배송지 조회/수정 가능
CREATE POLICY "Admins can manage all addresses"
  ON public.addresses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX idx_addresses_is_default ON public.addresses(is_default);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 트리거: 기본 배송지 설정 시 다른 배송지의 기본 설정 해제
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- 같은 사용자의 다른 배송지들의 기본 설정 해제
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

-- 주석
COMMENT ON TABLE public.addresses IS '사용자 배송지 정보 (우체국 API 연동용)';
COMMENT ON COLUMN public.addresses.label IS '배송지 별칭 (집, 회사 등)';
COMMENT ON COLUMN public.addresses.recipient_name IS '수령인 이름';
COMMENT ON COLUMN public.addresses.recipient_phone IS '수령인 전화번호';
COMMENT ON COLUMN public.addresses.zipcode IS '우편번호 (5자리)';
COMMENT ON COLUMN public.addresses.address IS '기본 주소';
COMMENT ON COLUMN public.addresses.address_detail IS '상세 주소 (동, 호수 등)';
COMMENT ON COLUMN public.addresses.is_default IS '기본 배송지 여부 (사용자당 1개만 true)';

