-- ============================================
-- 모두의수선 - 주문 테이블
-- ============================================

-- 주문 상태 ENUM
CREATE TYPE order_status AS ENUM (
  'PENDING',        -- 결제 대기
  'PAID',           -- 결제 완료
  'BOOKED',         -- 수거예약 완료
  'INBOUND',        -- 입고 완료
  'PROCESSING',     -- 수선 중
  'READY_TO_SHIP',  -- 출고 완료
  'DELIVERED',      -- 배송 완료
  'CANCELLED'       -- 취소
);

-- 결제 상태 ENUM
CREATE TYPE payment_status AS ENUM (
  'PENDING',   -- 결제 대기
  'PAID',      -- 결제 완료
  'FAILED',    -- 결제 실패
  'REFUNDED'   -- 환불
);

-- 주문 테이블
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 고객 정보
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  -- 주문 정보
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_category TEXT,
  
  -- 이미지
  image_urls TEXT[],
  
  -- 가격
  base_price INTEGER NOT NULL DEFAULT 0,
  additional_price INTEGER DEFAULT 0,
  total_price INTEGER NOT NULL,
  
  -- 상태
  status order_status NOT NULL DEFAULT 'PENDING',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  
  -- 송장번호 (핵심 FK)
  tracking_no TEXT UNIQUE,
  
  -- 주소
  pickup_address TEXT NOT NULL,
  pickup_address_detail TEXT,
  pickup_zipcode TEXT,
  delivery_address TEXT NOT NULL,
  delivery_address_detail TEXT,
  delivery_zipcode TEXT,
  
  -- 요청사항
  notes TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- 제약조건
  CONSTRAINT orders_total_price_check CHECK (total_price >= 0),
  CONSTRAINT orders_base_price_check CHECK (base_price >= 0)
);

-- RLS 활성화
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 주문만 조회 가능
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM public.users WHERE id = orders.user_id
  ));

-- 정책: 관리자는 모든 주문 조회/수정 가능
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can update all orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_tracking_no ON public.orders(tracking_no);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.orders IS '수선 주문 정보';
COMMENT ON COLUMN public.orders.tracking_no IS '우체국 송장번호 (모든 데이터의 FK)';
COMMENT ON COLUMN public.orders.additional_price IS '추가 비용 (검수 후 발생)';

