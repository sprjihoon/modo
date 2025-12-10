-- ============================================
-- 주문 상태 변경 시 푸시 알림 자동 발송
-- ============================================
-- 작성일: 2025-12-10
-- 설명: orders 테이블의 status 변경을 감지하여 Edge Function 호출

-- 1. 알림 이벤트 테이블 생성 (로그 및 재시도용)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'order_status_changed', 'extra_charge_pending', etc.
  old_status TEXT,
  new_status TEXT NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  fcm_token TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_events IS '알림 발송 이벤트 로그';
COMMENT ON COLUMN public.notification_events.event_type IS '이벤트 타입 (order_status_changed 등)';
COMMENT ON COLUMN public.notification_events.notification_sent IS '알림 발송 성공 여부';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_events_order_id ON public.notification_events(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_user_id ON public.notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_sent ON public.notification_events(notification_sent);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON public.notification_events(created_at DESC);

-- RLS 활성화
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 알림 이벤트만 조회 가능
CREATE POLICY "Users can view own notification events"
  ON public.notification_events
  FOR SELECT
  USING (auth.uid() IN (
    SELECT auth_id FROM public.users WHERE id = notification_events.user_id
  ));

-- 정책: 관리자는 모든 알림 이벤트 조회 가능
CREATE POLICY "Admins can view all notification events"
  ON public.notification_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER')
    )
  );

-- 2. 알림 메시지 템플릿 함수
CREATE OR REPLACE FUNCTION get_notification_message(
  p_status TEXT,
  p_order_number TEXT
) RETURNS JSONB AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
BEGIN
  CASE p_status
    WHEN 'PAID' THEN
      v_title := '결제 완료';
      v_body := '주문(' || p_order_number || ')의 결제가 완료되었습니다.';
    WHEN 'BOOKED' THEN
      v_title := '수거예약 완료';
      v_body := '주문(' || p_order_number || ')의 수거예약이 완료되었습니다. 곧 방문 예정입니다.';
    WHEN 'INBOUND' THEN
      v_title := '입고 완료';
      v_body := '주문(' || p_order_number || ')이 입고되었습니다. 곧 수선을 시작합니다.';
    WHEN 'PROCESSING' THEN
      v_title := '수선 중';
      v_body := '주문(' || p_order_number || ')의 수선 작업이 시작되었습니다.';
    WHEN 'HOLD' THEN
      v_title := '작업 대기';
      v_body := '주문(' || p_order_number || ')이 일시 대기 중입니다. 확인이 필요합니다.';
    WHEN 'READY_TO_SHIP' THEN
      v_title := '출고 완료';
      v_body := '주문(' || p_order_number || ')의 수선이 완료되어 출고되었습니다.';
    WHEN 'DELIVERED' THEN
      v_title := '배송 완료';
      v_body := '주문(' || p_order_number || ')이 배송 완료되었습니다. 감사합니다!';
    WHEN 'RETURN_PENDING' THEN
      v_title := '반송 대기';
      v_body := '주문(' || p_order_number || ')이 반송 대기 중입니다.';
    WHEN 'CANCELLED' THEN
      v_title := '주문 취소';
      v_body := '주문(' || p_order_number || ')이 취소되었습니다.';
    ELSE
      v_title := '주문 상태 변경';
      v_body := '주문(' || p_order_number || ')의 상태가 변경되었습니다.';
  END CASE;

  RETURN jsonb_build_object(
    'title', v_title,
    'body', v_body
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 추가 과금 알림 메시지 함수
CREATE OR REPLACE FUNCTION get_extra_charge_notification_message(
  p_extra_charge_status TEXT,
  p_order_number TEXT,
  p_price INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
BEGIN
  CASE p_extra_charge_status
    WHEN 'PENDING_CUSTOMER' THEN
      v_title := '추가 결제 요청';
      IF p_price IS NOT NULL THEN
        v_body := '주문(' || p_order_number || ')에 추가 작업이 필요합니다. 추가 금액: ' || p_price::TEXT || '원';
      ELSE
        v_body := '주문(' || p_order_number || ')에 추가 작업이 필요합니다. 확인해주세요.';
      END IF;
    WHEN 'COMPLETED' THEN
      v_title := '추가 결제 완료';
      v_body := '주문(' || p_order_number || ')의 추가 결제가 완료되었습니다. 작업을 재개합니다.';
    WHEN 'SKIPPED' THEN
      v_title := '원안대로 진행';
      v_body := '주문(' || p_order_number || ')을 추가 작업 없이 원안대로 진행합니다.';
    WHEN 'RETURN_REQUESTED' THEN
      v_title := '반송 요청';
      v_body := '주문(' || p_order_number || ')의 반송이 요청되었습니다.';
    ELSE
      v_title := '주문 업데이트';
      v_body := '주문(' || p_order_number || ')에 변경사항이 있습니다.';
  END CASE;

  RETURN jsonb_build_object(
    'title', v_title,
    'body', v_body
  );
END;
$$ LANGUAGE plpgsql;

-- 4. 알림 이벤트 생성 함수
CREATE OR REPLACE FUNCTION create_notification_event(
  p_order_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_old_status TEXT,
  p_new_status TEXT
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_fcm_token TEXT;
BEGIN
  -- FCM 토큰 조회
  SELECT fcm_token INTO v_fcm_token
  FROM public.users
  WHERE id = p_user_id;

  -- FCM 토큰이 없으면 이벤트만 기록하고 종료
  IF v_fcm_token IS NULL THEN
    INSERT INTO public.notification_events (
      order_id, user_id, event_type, old_status, new_status,
      notification_sent, error_message
    ) VALUES (
      p_order_id, p_user_id, p_event_type, p_old_status, p_new_status,
      FALSE, 'FCM token not found'
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
  END IF;

  -- 알림 이벤트 생성
  INSERT INTO public.notification_events (
    order_id, user_id, event_type, old_status, new_status, fcm_token
  ) VALUES (
    p_order_id, p_user_id, p_event_type, p_old_status, p_new_status, v_fcm_token
  ) RETURNING id INTO v_event_id;

  -- Edge Function 호출 (비동기 - pg_net 사용 또는 Supabase Hooks)
  -- 현재는 이벤트만 생성하고, Edge Function에서 주기적으로 폴링하거나
  -- Supabase Webhook/Trigger로 호출
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function: 주문 상태 변경 시
CREATE OR REPLACE FUNCTION on_order_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- status가 변경되었을 때만
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_notification_event(
      NEW.id,
      NEW.user_id,
      'order_status_changed',
      OLD.status::TEXT,
      NEW.status::TEXT
    );
  END IF;

  -- extra_charge_status가 변경되었을 때
  IF OLD.extra_charge_status IS DISTINCT FROM NEW.extra_charge_status THEN
    -- 고객이 액션을 취해야 하는 상태만 알림
    IF NEW.extra_charge_status IN ('PENDING_CUSTOMER', 'COMPLETED', 'SKIPPED', 'RETURN_REQUESTED') THEN
      PERFORM create_notification_event(
        NEW.id,
        NEW.user_id,
        'extra_charge_status_changed',
        OLD.extra_charge_status::TEXT,
        NEW.extra_charge_status::TEXT
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger 생성
DROP TRIGGER IF EXISTS trigger_order_status_changed ON public.orders;
CREATE TRIGGER trigger_order_status_changed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION on_order_status_changed();

-- 7. updated_at 자동 갱신 트리거 (notification_events)
CREATE TRIGGER update_notification_events_updated_at
  BEFORE UPDATE ON public.notification_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. 권한 부여
GRANT EXECUTE ON FUNCTION get_notification_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_extra_charge_notification_message TO authenticated;

-- 9. 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ 주문 상태 변경 알림 시스템 구축 완료';
  RAISE NOTICE '   - notification_events 테이블 생성';
  RAISE NOTICE '   - 알림 메시지 템플릿 함수 생성';
  RAISE NOTICE '   - 주문 상태 변경 트리거 생성';
  RAISE NOTICE '';
  RAISE NOTICE '📱 다음 단계:';
  RAISE NOTICE '   1. Edge Function 배포 (send-push-notification)';
  RAISE NOTICE '   2. Firebase Cloud Messaging 설정';
  RAISE NOTICE '   3. Flutter 앱에서 FCM 초기화';
END $$;

