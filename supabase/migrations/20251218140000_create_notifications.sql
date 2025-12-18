-- ============================================
-- 사용자별 알림 테이블 생성
-- ============================================
-- 작성일: 2025-12-18
-- 설명: 각 사용자에게 전달되는 개별 알림을 저장하는 테이블

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 수신 사용자
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 알림 제목
  title TEXT NOT NULL,
  
  -- 알림 본문
  body TEXT NOT NULL,
  
  -- 알림 유형
  type TEXT NOT NULL DEFAULT 'general', -- 'order_status', 'extra_charge', 'announcement', 'general'
  
  -- 관련 주문 ID (선택사항)
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- 관련 공지사항 ID (선택사항)
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  
  -- 읽음 여부
  read_at TIMESTAMPTZ,
  
  -- 생성일
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 추가 데이터 (JSON)
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.notifications IS '사용자별 알림 저장 테이블';
COMMENT ON COLUMN public.notifications.type IS '알림 유형 (order_status, extra_charge, announcement, general)';
COMMENT ON COLUMN public.notifications.metadata IS '추가 정보 (링크, 이미지 등)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
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

-- 정책: 사용자는 자신의 알림만 업데이트 가능 (읽음 표시)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 관리자는 모든 알림 관리 가능
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER')
    )
  );

-- ============================================
-- 알림 생성 함수
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'general',
  p_order_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    order_id,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_body,
    p_type,
    p_order_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 알림 읽음 표시 함수
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_as_read(
  p_notification_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 현재 사용자 ID 가져오기
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 알림 읽음 표시
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = v_user_id
    AND read_at IS NULL;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 모든 알림 읽음 표시 함수
-- ============================================
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- 현재 사용자 ID 가져오기
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- 모든 읽지 않은 알림을 읽음으로 표시
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = v_user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO authenticated;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ notifications 테이블 생성 완료';
  RAISE NOTICE '   - 사용자별 알림 저장';
  RAISE NOTICE '   - RLS 정책 설정';
  RAISE NOTICE '   - 헬퍼 함수 3개 생성';
END $$;

