-- ============================================================
-- 배송지 변경 추적 컬럼 추가
-- - orders.delivery_address_updated_at : 고객이 배송지를 변경한 시각
-- - shipments.delivery_tracking_created_at : 출고 송장이 최초 생성된 시각
-- ============================================================

-- orders 테이블에 배송지 변경 시각 컬럼 추가
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_address_updated_at TIMESTAMPTZ;

-- shipments 테이블에 출고 송장 생성 시각 컬럼 추가
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS delivery_tracking_created_at TIMESTAMPTZ;

-- 기존 데이터 중 delivery_tracking_no 가 이미 있는 행에 대해
-- delivery_tracking_created_at 을 updated_at 으로 초기화 (근사값)
UPDATE public.shipments
SET delivery_tracking_created_at = updated_at
WHERE delivery_tracking_no IS NOT NULL
  AND delivery_tracking_created_at IS NULL;
