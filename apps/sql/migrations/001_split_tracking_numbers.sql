-- ============================================
-- 송장번호 분리: tracking_no → pickup_tracking_no, delivery_tracking_no
-- ============================================

-- 1. 새 컬럼 추가
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS pickup_tracking_no TEXT,
  ADD COLUMN IF NOT EXISTS delivery_tracking_no TEXT;

-- 2. 기존 tracking_no를 pickup_tracking_no로 복사
UPDATE public.shipments
SET pickup_tracking_no = tracking_no
WHERE pickup_tracking_no IS NULL;

-- 3. tracking_no 컬럼을 nullable로 변경 (하위 호환성)
ALTER TABLE public.shipments
  ALTER COLUMN tracking_no DROP NOT NULL;

-- 4. 주석 추가
COMMENT ON COLUMN public.shipments.tracking_no IS '(Deprecated) 기존 송장번호 - pickup_tracking_no 사용';
COMMENT ON COLUMN public.shipments.pickup_tracking_no IS '회수(수거) 송장번호 - 우체국 API에서 발급';
COMMENT ON COLUMN public.shipments.delivery_tracking_no IS '발송(배송) 송장번호 - 우체국 API에서 발급';

-- 5. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_tracking ON public.shipments(pickup_tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_tracking ON public.shipments(delivery_tracking_no);

