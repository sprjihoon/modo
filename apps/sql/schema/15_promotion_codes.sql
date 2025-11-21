-- ============================================
-- 모두의수선 - 프로모션 코드 테이블
-- ============================================

-- 할인 타입 ENUM
CREATE TYPE discount_type AS ENUM (
  'PERCENTAGE',  -- 퍼센트 할인 (예: 10%)
  'FIXED'        -- 고정 금액 할인 (예: 5000원)
);

-- 프로모션 코드 테이블
CREATE TABLE IF NOT EXISTS public.promotion_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 프로모션 코드
  code TEXT NOT NULL UNIQUE,  -- 프로모션 코드 (예: WELCOME2024)
  
  -- 할인 정보
  discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
  discount_value INTEGER NOT NULL,  -- 할인 값 (퍼센트 또는 금액)
  
  -- 사용 제한
  max_uses INTEGER,  -- 최대 사용 가능 횟수 (NULL = 무제한)
  used_count INTEGER NOT NULL DEFAULT 0,  -- 현재 사용된 횟수
  max_uses_per_user INTEGER DEFAULT 1,  -- 사용자당 최대 사용 횟수
  
  -- 금액 제한
  min_order_amount INTEGER DEFAULT 0,  -- 최소 주문 금액
  max_discount_amount INTEGER,  -- 최대 할인 금액 (NULL = 무제한)
  
  -- 유효기간
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 시작일
  valid_until TIMESTAMPTZ,  -- 종료일 (NULL = 무기한)
  
  -- 설명 및 상태
  description TEXT,  -- 프로모션 설명
  is_active BOOLEAN NOT NULL DEFAULT true,  -- 활성 여부
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),  -- 생성자
  
  -- 제약조건
  CONSTRAINT promotion_codes_discount_value_check CHECK (discount_value > 0),
  CONSTRAINT promotion_codes_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT promotion_codes_used_count_check CHECK (used_count >= 0),
  CONSTRAINT promotion_codes_percentage_check CHECK (
    discount_type != 'PERCENTAGE' OR (discount_value > 0 AND discount_value <= 100)
  )
);

-- 프로모션 코드 사용 이력 테이블
CREATE TABLE IF NOT EXISTS public.promotion_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 프로모션 코드
  promotion_code_id UUID NOT NULL REFERENCES public.promotion_codes(id) ON DELETE CASCADE,
  
  -- 사용자 및 주문
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- 할인 정보
  discount_amount INTEGER NOT NULL,  -- 실제 할인된 금액
  original_amount INTEGER NOT NULL,  -- 원래 주문 금액
  final_amount INTEGER NOT NULL,  -- 최종 결제 금액
  
  -- 메타데이터
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT promotion_code_usages_unique_order UNIQUE (order_id),  -- 주문당 1개의 프로모션 코드만
  CONSTRAINT promotion_code_usages_discount_check CHECK (discount_amount >= 0),
  CONSTRAINT promotion_code_usages_amounts_check CHECK (final_amount >= 0 AND final_amount <= original_amount)
);

-- 인덱스
CREATE INDEX idx_promotion_codes_code ON public.promotion_codes(code);
CREATE INDEX idx_promotion_codes_active ON public.promotion_codes(is_active);
CREATE INDEX idx_promotion_codes_valid_period ON public.promotion_codes(valid_from, valid_until);
CREATE INDEX idx_promotion_code_usages_user ON public.promotion_code_usages(user_id);
CREATE INDEX idx_promotion_code_usages_promo_code ON public.promotion_code_usages(promotion_code_id);

-- RLS 활성화
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 활성 프로모션 코드 조회 가능
CREATE POLICY "Anyone can view active promotion codes"
  ON public.promotion_codes
  FOR SELECT
  USING (is_active = true);

-- 정책: 관리자만 프로모션 코드 생성/수정/삭제 가능
CREATE POLICY "Admins can manage promotion codes"
  ON public.promotion_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 정책: 사용자는 자신의 프로모션 코드 사용 이력만 조회 가능
CREATE POLICY "Users can view own promotion code usages"
  ON public.promotion_code_usages
  FOR SELECT
  USING (user_id = auth.uid());

-- 정책: 시스템에서만 프로모션 코드 사용 이력 생성 가능 (서비스 역할)
CREATE POLICY "Service role can create promotion code usages"
  ON public.promotion_code_usages
  FOR INSERT
  WITH CHECK (true);

-- 트리거: 업데이트 시간 자동 갱신
CREATE OR REPLACE FUNCTION update_promotion_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promotion_codes_updated_at
  BEFORE UPDATE ON public.promotion_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_codes_updated_at();

-- 샘플 프로모션 코드 (테스트용)
INSERT INTO public.promotion_codes (code, discount_type, discount_value, max_uses, description, valid_until)
VALUES 
  ('WELCOME10', 'PERCENTAGE', 10, NULL, '신규 가입 고객 10% 할인', NOW() + INTERVAL '30 days'),
  ('SAVE5000', 'FIXED', 5000, 100, '5000원 즉시 할인', NOW() + INTERVAL '7 days'),
  ('HOLIDAY20', 'PERCENTAGE', 20, 50, '연말 특별 20% 할인', NOW() + INTERVAL '14 days');

-- 주석
COMMENT ON TABLE public.promotion_codes IS '프로모션 코드 테이블';
COMMENT ON TABLE public.promotion_code_usages IS '프로모션 코드 사용 이력';
COMMENT ON COLUMN public.promotion_codes.code IS '프로모션 코드 (예: WELCOME2024)';
COMMENT ON COLUMN public.promotion_codes.discount_type IS '할인 타입: PERCENTAGE(퍼센트) 또는 FIXED(고정금액)';
COMMENT ON COLUMN public.promotion_codes.discount_value IS '할인 값 (퍼센트 또는 금액)';
COMMENT ON COLUMN public.promotion_codes.max_uses IS '최대 사용 가능 횟수 (NULL = 무제한)';
COMMENT ON COLUMN public.promotion_codes.max_uses_per_user IS '사용자당 최대 사용 횟수';

