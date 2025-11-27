-- shipments 테이블에 배송 정보(우체국 API 응답) 저장용 컬럼 추가
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS delivery_info JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.shipments.delivery_info IS '우체국 API 응답 정보 (도착지 코드, 분류 코드 등)';

