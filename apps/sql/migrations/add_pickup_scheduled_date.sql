-- ============================================
-- 수거 예정일 컬럼 추가 및 알림 스케줄링 지원
-- ============================================
-- 작성일: 2026-01-17
-- 설명: 우체국 API resDate 기반 수거일 알림 푸시를 위한 스키마 변경

-- 1. shipments 테이블에 pickup_scheduled_date 컬럼 추가
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS pickup_scheduled_date DATE;

COMMENT ON COLUMN public.shipments.pickup_scheduled_date IS '수거 예정일 (우체국 API resDate 기반, YYYY-MM-DD)';

-- 인덱스 추가 (D-1, 당일 알림 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_scheduled_date 
ON public.shipments(pickup_scheduled_date) 
WHERE status = 'BOOKED';

-- 2. 알림 발송 이력 추적을 위한 컬럼 추가
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS pickup_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shipments.pickup_reminder_sent_at IS 'D-1 수거 알림 발송 시각';

ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS pickup_day_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shipments.pickup_day_reminder_sent_at IS '당일 수거 알림 발송 시각';

-- 3. notifications 테이블에 새로운 알림 타입 추가 (type 컬럼이 TEXT이므로 별도 작업 불필요)
-- 새로운 타입: 'pickup_reminder', 'pickup_today'

-- 4. 수거 예정일 기반 알림 대상 조회 함수
CREATE OR REPLACE FUNCTION get_pickup_reminders_for_date(target_date DATE)
RETURNS TABLE (
  shipment_id UUID,
  order_id UUID,
  user_id UUID,
  tracking_no TEXT,
  pickup_scheduled_date DATE,
  customer_name TEXT,
  pickup_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shipment_id,
    s.order_id,
    o.user_id,
    s.tracking_no,
    s.pickup_scheduled_date,
    s.customer_name,
    s.pickup_address
  FROM public.shipments s
  JOIN public.orders o ON s.order_id = o.id
  WHERE s.pickup_scheduled_date = target_date
    AND s.status = 'BOOKED'
    AND s.pickup_reminder_sent_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 당일 수거 알림 대상 조회 함수
CREATE OR REPLACE FUNCTION get_pickup_day_reminders_for_date(target_date DATE)
RETURNS TABLE (
  shipment_id UUID,
  order_id UUID,
  user_id UUID,
  tracking_no TEXT,
  pickup_scheduled_date DATE,
  customer_name TEXT,
  pickup_address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shipment_id,
    s.order_id,
    o.user_id,
    s.tracking_no,
    s.pickup_scheduled_date,
    s.customer_name,
    s.pickup_address
  FROM public.shipments s
  JOIN public.orders o ON s.order_id = o.id
  WHERE s.pickup_scheduled_date = target_date
    AND s.status = 'BOOKED'
    AND s.pickup_day_reminder_sent_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 알림 발송 이력 업데이트 함수
CREATE OR REPLACE FUNCTION mark_pickup_reminder_sent(p_shipment_id UUID, p_reminder_type TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_reminder_type = 'D-1' THEN
    UPDATE public.shipments 
    SET pickup_reminder_sent_at = NOW()
    WHERE id = p_shipment_id;
  ELSIF p_reminder_type = 'TODAY' THEN
    UPDATE public.shipments 
    SET pickup_day_reminder_sent_at = NOW()
    WHERE id = p_shipment_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION get_pickup_reminders_for_date TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pickup_day_reminders_for_date TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_pickup_reminder_sent TO service_role;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ 수거 예정일 알림 스키마 추가 완료';
  RAISE NOTICE '   - shipments.pickup_scheduled_date 컬럼 추가';
  RAISE NOTICE '   - shipments.pickup_reminder_sent_at 컬럼 추가';
  RAISE NOTICE '   - shipments.pickup_day_reminder_sent_at 컬럼 추가';
  RAISE NOTICE '   - get_pickup_reminders_for_date() 함수 추가';
  RAISE NOTICE '   - get_pickup_day_reminders_for_date() 함수 추가';
  RAISE NOTICE '   - mark_pickup_reminder_sent() 함수 추가';
END $$;

