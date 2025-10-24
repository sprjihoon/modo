-- ============================================
-- 모두의수선 - 알림 테이블
-- ============================================

-- 알림 타입 ENUM
CREATE TYPE notification_type AS ENUM (
  'ORDER_CREATED',      -- 주문 생성
  'PAYMENT_COMPLETED',  -- 결제 완료
  'SHIPMENT_BOOKED',    -- 수거예약 완료
  'INBOUND_COMPLETED',  -- 입고 완료
  'INBOUND_VIDEO',      -- 입고 영상 업로드
  'PROCESSING',         -- 수선 시작
  'OUTBOUND_COMPLETED', -- 출고 완료
  'OUTBOUND_VIDEO',     -- 출고 영상 업로드
  'DELIVERY_STARTED',   -- 배송 시작
  'DELIVERED',          -- 배송 완료
  'ADDITIONAL_PAYMENT', -- 추가 결제 필요
  'SYSTEM'              -- 시스템 알림
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 수신자
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 알림 타입
  type notification_type NOT NULL,
  
  -- 알림 내용
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- 관련 데이터
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tracking_no TEXT,
  
  -- 추가 데이터 (JSON)
  data JSONB DEFAULT '{}'::jsonb,
  
  -- 상태
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- FCM 전송 정보
  fcm_sent BOOLEAN NOT NULL DEFAULT FALSE,
  fcm_sent_at TIMESTAMPTZ,
  fcm_message_id TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT notifications_read_check CHECK (
    (is_read = FALSE AND read_at IS NULL) OR
    (is_read = TRUE AND read_at IS NOT NULL)
  )
);

-- RLS 활성화
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 알림만 조회/수정 가능
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 시스템(Edge Functions)이 알림 생성 가능
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX idx_notifications_tracking_no ON public.notifications(tracking_no);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- 주석
COMMENT ON TABLE public.notifications IS '사용자 알림 (FCM 푸시 포함)';
COMMENT ON COLUMN public.notifications.fcm_message_id IS 'Firebase Cloud Messaging 메시지 ID';

