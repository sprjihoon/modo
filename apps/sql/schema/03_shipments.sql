-- ============================================
-- 모두의수선 - 송장/배송 테이블
-- ============================================

-- 배송 상태 ENUM
CREATE TYPE shipment_status AS ENUM (
  'BOOKED',         -- 수거예약 완료
  'PICKED_UP',      -- 수거 완료
  'IN_TRANSIT',     -- 배송 중
  'INBOUND',        -- 입고 완료
  'PROCESSING',     -- 수선 중
  'READY_TO_SHIP',  -- 출고 완료
  'OUT_FOR_DELIVERY', -- 배송 중
  'DELIVERED'       -- 배송 완료
);

-- 택배사 ENUM
CREATE TYPE carrier AS ENUM (
  'EPOST',    -- 우체국 택배
  'CJ',       -- CJ대한통운
  'HANJIN',   -- 한진택배
  'LOTTE',    -- 롯데택배
  'OTHER'     -- 기타
);

-- 송장/배송 테이블
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 연결
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- 송장번호 (핵심 식별자)
  tracking_no TEXT NOT NULL UNIQUE,
  
  -- 택배사
  carrier carrier NOT NULL DEFAULT 'EPOST',
  
  -- 상태
  status shipment_status NOT NULL DEFAULT 'BOOKED',
  
  -- 수거 정보
  pickup_address TEXT NOT NULL,
  pickup_address_detail TEXT,
  pickup_zipcode TEXT,
  pickup_phone TEXT NOT NULL,
  pickup_requested_at TIMESTAMPTZ,
  pickup_completed_at TIMESTAMPTZ,
  
  -- 배송 정보
  delivery_address TEXT NOT NULL,
  delivery_address_detail TEXT,
  delivery_zipcode TEXT,
  delivery_phone TEXT NOT NULL,
  delivery_started_at TIMESTAMPTZ,
  delivery_completed_at TIMESTAMPTZ,
  
  -- 고객명
  customer_name TEXT NOT NULL,
  
  -- 입출고 영상 (FK to videos table)
  inbound_video_id UUID,
  outbound_video_id UUID,
  
  -- 배송 추적 이벤트 (JSON)
  tracking_events JSONB DEFAULT '[]'::jsonb,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT shipments_tracking_no_format CHECK (LENGTH(tracking_no) >= 10)
);

-- RLS 활성화
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 송장만 조회 가능
CREATE POLICY "Users can view own shipments"
  ON public.shipments
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- 정책: 관리자는 모든 송장 조회/수정 가능
CREATE POLICY "Admins can manage all shipments"
  ON public.shipments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking_no ON public.shipments(tracking_no);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_carrier ON public.shipments(carrier);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.shipments IS '송장 및 배송 정보 (tracking_no가 핵심)';
COMMENT ON COLUMN public.shipments.tracking_no IS '우체국 송장번호';
COMMENT ON COLUMN public.shipments.tracking_events IS '배송 추적 이벤트 로그 (JSON 배열)';

