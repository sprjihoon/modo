-- ============================================
-- 주문 취소 시 관련 알림 자동 삭제 트리거
-- ============================================
-- 주문이 CANCELLED 상태로 변경되면 해당 주문의 알림을 자동 삭제합니다.

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION delete_notifications_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- 주문 상태가 CANCELLED로 변경되었을 때
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status <> 'CANCELLED') THEN
    -- 해당 주문의 알림 삭제
    DELETE FROM public.notifications
    WHERE order_id = NEW.id;
    
    RAISE NOTICE '🗑️ 주문 % 취소로 인해 알림 삭제됨', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 트리거 생성 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_delete_notifications_on_order_cancel ON public.orders;

CREATE TRIGGER trigger_delete_notifications_on_order_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION delete_notifications_on_order_cancel();

-- 3. 기존 취소된 주문의 알림 정리 (일회성)
DELETE FROM public.notifications
WHERE order_id IN (
  SELECT id FROM public.orders WHERE status = 'CANCELLED'
);

-- 주석
COMMENT ON FUNCTION delete_notifications_on_order_cancel() IS '주문 취소 시 관련 알림을 자동으로 삭제하는 트리거 함수';

-- 확인
SELECT 
  'trigger_delete_notifications_on_order_cancel' as trigger_name,
  'orders' as table_name,
  'AFTER UPDATE' as timing,
  'delete_notifications_on_order_cancel()' as function_name;

