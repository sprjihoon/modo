-- ============================================
-- shipments 테이블 완전한 스키마
-- ============================================

-- shipments 테이블 생성/업데이트
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 연결
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- 송장번호 (핵심)
  tracking_no TEXT UNIQUE NOT NULL,
  pickup_tracking_no TEXT,
  delivery_tracking_no TEXT,
  
  -- 배송지 ID 연결
  pickup_address_id UUID,
  delivery_address_id UUID,
  
  -- 수거 주소
  pickup_address TEXT,
  pickup_address_detail TEXT,
  pickup_zipcode TEXT,
  pickup_phone TEXT,
  
  -- 배송 주소
  delivery_address TEXT,
  delivery_address_detail TEXT,
  delivery_zipcode TEXT,
  delivery_phone TEXT,
  
  -- 고객 정보
  customer_name TEXT,
  
  -- 배송 상태
  status TEXT DEFAULT 'PENDING',
  carrier TEXT DEFAULT 'EPOST',
  
  -- 요청/완료 시간
  pickup_requested_at TIMESTAMPTZ,
  pickup_completed_at TIMESTAMPTZ,
  delivery_started_at TIMESTAMPTZ,
  delivery_completed_at TIMESTAMPTZ,
  
  -- 추적 이벤트 (JSONB)
  tracking_events JSONB,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;

-- 새 정책: 모든 인증 사용자 허용 (개발 중)
CREATE POLICY "allow_all_shipments"
  ON public.shipments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_no ON public.shipments(tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_tracking_no ON public.shipments(pickup_tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_tracking_no ON public.shipments(delivery_tracking_no);

-- 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shipments'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ shipments 테이블이 업데이트되었습니다!';
END $$;

