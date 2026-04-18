-- 배송비 프로모션 테이블
-- 유형: FIRST_ORDER(첫 주문), FREE_ABOVE_AMOUNT(일정 금액 이상 무료),
--       PERCENTAGE_OFF(기간 할인%), FIXED_DISCOUNT(고정 할인액)
CREATE TABLE IF NOT EXISTS shipping_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('FIRST_ORDER', 'FREE_ABOVE_AMOUNT', 'PERCENTAGE_OFF', 'FIXED_DISCOUNT')),
  discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value INTEGER NOT NULL CHECK (discount_value >= 0),
  min_order_amount INTEGER NOT NULL DEFAULT 0,
  max_discount_amount INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shipping_promotions IS '배송비 프로모션 관리';
COMMENT ON COLUMN shipping_promotions.type IS 'FIRST_ORDER=첫주문, FREE_ABOVE_AMOUNT=일정금액이상, PERCENTAGE_OFF=기간%할인, FIXED_DISCOUNT=고정금액할인';
COMMENT ON COLUMN shipping_promotions.discount_type IS 'PERCENTAGE=비율할인, FIXED=고정금액할인';
COMMENT ON COLUMN shipping_promotions.discount_value IS 'PERCENTAGE면 0~100(%), FIXED면 원(KRW)';
COMMENT ON COLUMN shipping_promotions.min_order_amount IS '적용 최소 수선비(배송비 제외)';

-- orders 테이블에 배송비 할인 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_promotion_id UUID REFERENCES shipping_promotions(id);

COMMENT ON COLUMN orders.shipping_discount_amount IS '배송비 할인 금액';
COMMENT ON COLUMN orders.shipping_promotion_id IS '적용된 배송비 프로모션';

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_shipping_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipping_promotions_updated_at
  BEFORE UPDATE ON shipping_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_shipping_promotions_updated_at();

-- RLS 정책
ALTER TABLE shipping_promotions ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 읽기 가능 (주문 생성 시 조회)
CREATE POLICY "shipping_promotions_read" ON shipping_promotions
  FOR SELECT USING (true);

-- 관리자만 수정 가능
CREATE POLICY "shipping_promotions_admin_write" ON shipping_promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER')
    )
  );

-- 샘플 첫 주문 배송비 지원 프로모션 (기본 비활성)
INSERT INTO shipping_promotions (name, type, discount_type, discount_value, min_order_amount, description, is_active, valid_from)
VALUES
  (
    '첫 주문 배송비 무료',
    'FIRST_ORDER',
    'PERCENTAGE',
    100,
    0,
    '첫 주문 고객에게 왕복배송비(7,000원) 100% 지원',
    false,
    NOW()
  ),
  (
    '5만원 이상 배송비 무료',
    'FREE_ABOVE_AMOUNT',
    'PERCENTAGE',
    100,
    50000,
    '수선비 5만원 이상 시 왕복배송비 무료',
    false,
    NOW()
  );
