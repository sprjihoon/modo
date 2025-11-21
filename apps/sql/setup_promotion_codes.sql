-- ============================================
-- 프로모션 코드 기능 전체 설정
-- Supabase SQL Editor에서 전체 복사하여 실행하세요
-- ============================================

-- 1. 할인 타입 ENUM 생성
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 프로모션 코드 테이블 생성
CREATE TABLE IF NOT EXISTS public.promotion_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 프로모션 코드
  code TEXT NOT NULL UNIQUE,
  
  -- 할인 정보
  discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
  discount_value INTEGER NOT NULL,
  
  -- 사용 제한
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- 금액 제한
  min_order_amount INTEGER DEFAULT 0,
  max_discount_amount INTEGER,
  
  -- 유효기간
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- 설명 및 상태
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- 제약조건
  CONSTRAINT promotion_codes_discount_value_check CHECK (discount_value > 0),
  CONSTRAINT promotion_codes_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT promotion_codes_used_count_check CHECK (used_count >= 0),
  CONSTRAINT promotion_codes_percentage_check CHECK (
    discount_type != 'PERCENTAGE' OR (discount_value > 0 AND discount_value <= 100)
  )
);

-- 3. 프로모션 코드 사용 이력 테이블
CREATE TABLE IF NOT EXISTS public.promotion_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  promotion_code_id UUID NOT NULL REFERENCES public.promotion_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  discount_amount INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  final_amount INTEGER NOT NULL,
  
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT promotion_code_usages_unique_order UNIQUE (order_id),
  CONSTRAINT promotion_code_usages_discount_check CHECK (discount_amount >= 0),
  CONSTRAINT promotion_code_usages_amounts_check CHECK (final_amount >= 0 AND final_amount <= original_amount)
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_promotion_codes_code ON public.promotion_codes(code);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_active ON public.promotion_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promotion_codes_valid_period ON public.promotion_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promotion_code_usages_user ON public.promotion_code_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_code_usages_promo_code ON public.promotion_code_usages(promotion_code_id);

-- 5. RLS 활성화
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성
-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Admins can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view own promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Service role can create promotion code usages" ON public.promotion_code_usages;

-- 새 정책 생성
CREATE POLICY "Anyone can view active promotion codes"
  ON public.promotion_codes
  FOR SELECT
  USING (is_active = true);

-- 관리자 이메일로 권한 확인 (또는 모든 인증 사용자에게 관리 권한 부여)
CREATE POLICY "Admins can manage promotion codes"
  ON public.promotion_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (
        email LIKE '%@admin.modusrepair.com'
        OR true  -- 개발 중에는 모든 인증된 사용자에게 권한 부여
      )
    )
  );

CREATE POLICY "Users can view own promotion code usages"
  ON public.promotion_code_usages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can create promotion code usages"
  ON public.promotion_code_usages
  FOR INSERT
  WITH CHECK (true);

-- 7. 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_promotion_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_promotion_codes_updated_at ON public.promotion_codes;

CREATE TRIGGER trigger_update_promotion_codes_updated_at
  BEFORE UPDATE ON public.promotion_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_codes_updated_at();

-- 8. 프로모션 코드 사용 횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_promotion_code_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 권한 부여
GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO service_role;

-- 9. orders 테이블에 프로모션 코드 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promotion_code_id UUID REFERENCES public.promotion_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promotion_discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_total_price INTEGER;

-- 기존 주문 데이터 마이그레이션
UPDATE public.orders
SET original_total_price = total_price
WHERE original_total_price IS NULL;

-- 제약조건 추가 (이미 있다면 무시)
DO $$ BEGIN
  ALTER TABLE public.orders
  ADD CONSTRAINT orders_promotion_discount_check 
    CHECK (promotion_discount_amount >= 0 AND promotion_discount_amount <= COALESCE(original_total_price, total_price));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_promotion_code ON public.orders(promotion_code_id);

-- 10. 샘플 프로모션 코드 추가 (테스트용)
INSERT INTO public.promotion_codes (code, discount_type, discount_value, max_uses, description, valid_until, is_active)
VALUES 
  ('WELCOME10', 'PERCENTAGE', 10, NULL, '신규 가입 고객 10% 할인', NOW() + INTERVAL '30 days', true),
  ('SAVE5000', 'FIXED', 5000, 100, '5000원 즉시 할인', NOW() + INTERVAL '7 days', true),
  ('HOLIDAY20', 'PERCENTAGE', 20, 50, '연말 특별 20% 할인', NOW() + INTERVAL '14 days', true),
  ('FREESHIP', 'PERCENTAGE', 100, 20, '첫 주문 무료 이벤트 (최대 5만원)', NOW() + INTERVAL '60 days', true)
ON CONFLICT (code) DO NOTHING;

-- 샘플 데이터에 최대 할인 금액 설정
UPDATE public.promotion_codes 
SET max_discount_amount = 50000 
WHERE code = 'FREESHIP';

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ 프로모션 코드 기능이 성공적으로 설정되었습니다!';
  RAISE NOTICE '📝 샘플 프로모션 코드가 추가되었습니다:';
  RAISE NOTICE '   - WELCOME10: 10%% 할인';
  RAISE NOTICE '   - SAVE5000: 5,000원 할인';
  RAISE NOTICE '   - HOLIDAY20: 20%% 할인';
  RAISE NOTICE '   - FREESHIP: 100%% 할인 (최대 5만원)';
END $$;

-- 테이블 확인 쿼리
SELECT 
  code,
  discount_type,
  discount_value,
  max_uses,
  used_count,
  description,
  is_active,
  valid_until
FROM public.promotion_codes
ORDER BY created_at DESC;

