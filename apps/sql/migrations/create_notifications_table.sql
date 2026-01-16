-- ============================================
-- 사용자 알림 테이블 생성
-- ============================================
-- 작성일: 2026-01-15
-- 설명: 앱의 알림 페이지에서 사용하는 notifications 테이블

-- notifications 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- 알림 타입
  type TEXT NOT NULL DEFAULT 'order_status', 
  -- 'order_status', 'extra_charge', 'announcement', 'system'
  
  -- 알림 내용
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- 읽음 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- 메타데이터
  data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS '사용자 개인 알림';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 알림 읽음 처리 가능
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 시스템/서비스 역할은 알림 생성 가능
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (TRUE);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 주문 상태 변경 시 notifications에도 레코드 생성하도록 트리거 수정
-- ============================================
CREATE OR REPLACE FUNCTION create_user_notification(
  p_user_id UUID,
  p_order_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, order_id, type, title, body
  ) VALUES (
    p_user_id, p_order_id, p_type, p_title, p_body
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 함수 수정: notification_events + notifications 둘 다 생성
CREATE OR REPLACE FUNCTION on_order_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_msg JSONB;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- status가 변경되었을 때만
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- 알림 메시지 가져오기
    SELECT * INTO v_msg FROM get_notification_message(NEW.status::TEXT, NEW.order_number);
    v_title := v_msg->>'title';
    v_body := v_msg->>'body';
    
    -- notification_events에 기록 (기존)
    PERFORM create_notification_event(
      NEW.id,
      NEW.user_id,
      'order_status_changed',
      OLD.status::TEXT,
      NEW.status::TEXT
    );
    
    -- notifications 테이블에도 추가 (앱 표시용)
    PERFORM create_user_notification(
      NEW.user_id,
      NEW.id,
      'order_status',
      COALESCE(v_title, '주문 상태 변경'),
      COALESCE(v_body, '주문 상태가 변경되었습니다.')
    );
  END IF;

  -- extra_charge_status가 변경되었을 때
  IF OLD.extra_charge_status IS DISTINCT FROM NEW.extra_charge_status THEN
    -- 고객이 액션을 취해야 하는 상태만 알림
    IF NEW.extra_charge_status IN ('PENDING_CUSTOMER', 'COMPLETED', 'SKIPPED', 'RETURN_REQUESTED') THEN
      -- 알림 메시지 가져오기
      SELECT * INTO v_msg FROM get_extra_charge_notification_message(
        NEW.extra_charge_status::TEXT, 
        NEW.order_number,
        (NEW.extra_charge_data->>'managerPrice')::INTEGER
      );
      v_title := v_msg->>'title';
      v_body := v_msg->>'body';
      
      -- notification_events에 기록 (기존)
      PERFORM create_notification_event(
        NEW.id,
        NEW.user_id,
        'extra_charge_status_changed',
        OLD.extra_charge_status::TEXT,
        NEW.extra_charge_status::TEXT
      );
      
      -- notifications 테이블에도 추가 (앱 표시용)
      PERFORM create_user_notification(
        NEW.user_id,
        NEW.id,
        'extra_charge',
        COALESCE(v_title, '추가 결제 알림'),
        COALESCE(v_body, '추가 결제 관련 업데이트가 있습니다.')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION create_user_notification TO authenticated;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ notifications 테이블 생성 완료';
  RAISE NOTICE '   - 사용자별 알림 저장';
  RAISE NOTICE '   - 읽음 상태 관리';
  RAISE NOTICE '   - 주문 상태 변경 시 자동 생성';
END $$;

