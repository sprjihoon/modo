-- ============================================
-- shipments 테이블에 배송지 참조 추가
-- ============================================

-- 수거 배송지 참조 추가
ALTER TABLE public.shipments
ADD COLUMN pickup_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;

-- 배송 배송지 참조 추가  
ALTER TABLE public.shipments
ADD COLUMN delivery_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX idx_shipments_pickup_address_id ON public.shipments(pickup_address_id);
CREATE INDEX idx_shipments_delivery_address_id ON public.shipments(delivery_address_id);

-- 주석
COMMENT ON COLUMN public.shipments.pickup_address_id IS '수거 배송지 참조 (addresses 테이블)';
COMMENT ON COLUMN public.shipments.delivery_address_id IS '배송 배송지 참조 (addresses 테이블)';

