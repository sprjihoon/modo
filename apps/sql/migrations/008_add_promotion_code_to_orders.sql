-- ============================================
-- 주문 테이블에 프로모션 코드 필드 추가
-- ============================================

-- orders 테이블에 프로모션 코드 관련 컬럼 추가
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS promotion_code_id UUID REFERENCES public.promotion_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promotion_discount_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_total_price INTEGER;

-- 기존 데이터 마이그레이션 (original_total_price가 NULL인 경우 total_price로 설정)
UPDATE public.orders
SET original_total_price = total_price
WHERE original_total_price IS NULL;

-- 제약조건 추가
ALTER TABLE public.orders
ADD CONSTRAINT orders_promotion_discount_check 
  CHECK (promotion_discount_amount >= 0 AND promotion_discount_amount <= COALESCE(original_total_price, total_price));

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_promotion_code ON public.orders(promotion_code_id);

-- 주석 추가
COMMENT ON COLUMN public.orders.promotion_code_id IS '적용된 프로모션 코드 ID';
COMMENT ON COLUMN public.orders.promotion_discount_amount IS '프로모션 코드로 할인된 금액';
COMMENT ON COLUMN public.orders.original_total_price IS '할인 전 원래 금액';

