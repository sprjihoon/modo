-- ============================================
-- shipments 테이블 완전한 스키마
-- ============================================

-- shipments 테이블에 모든 필요한 컬럼 추가
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS pickup_tracking_no TEXT,
ADD COLUMN IF NOT EXISTS delivery_tracking_no TEXT,
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS pickup_address_detail TEXT,
ADD COLUMN IF NOT EXISTS pickup_zipcode TEXT,
ADD COLUMN IF NOT EXISTS pickup_phone TEXT,
ADD COLUMN IF NOT EXISTS pickup_address_id UUID,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_detail TEXT,
ADD COLUMN IF NOT EXISTS delivery_zipcode TEXT,
ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_id UUID,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS carrier TEXT DEFAULT 'EPOST',
ADD COLUMN IF NOT EXISTS pickup_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracking_events JSONB DEFAULT '[]'::jsonb;

-- RLS 단순화
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can manage all shipments" ON public.shipments;

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

-- 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shipments'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ shipments 테이블이 완전히 업데이트되었습니다!';
END $$;

