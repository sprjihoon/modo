-- ============================================
-- 일일 주문 제한량 관리 및 대기자 알림 시스템
-- ============================================
-- 작성일: 2026-01-19
-- 설명: 
--   1. 관리자가 하루 접수량 제한을 설정
--   2. 제한 초과 시 "오늘 처리 가능한 주문량이 다 찼어요" 메시지
--   3. 고객이 알림 요청 시 대기자 목록에 등록
--   4. 접수 가능해지면 대기자에게 푸시 알림

-- ============================================
-- 1. company_info 테이블에 일일 주문 제한량 컬럼 추가
-- ============================================
ALTER TABLE public.company_info 
ADD COLUMN IF NOT EXISTS daily_order_limit INTEGER DEFAULT NULL;

ALTER TABLE public.company_info 
ADD COLUMN IF NOT EXISTS order_limit_message TEXT DEFAULT '오늘 하루 처리 가능한 주문량이 다 찼어요. 알림 신청하시면 접수 가능할 때 알려드릴게요!';

COMMENT ON COLUMN public.company_info.daily_order_limit IS '일일 주문 제한량 (NULL이면 무제한)';
COMMENT ON COLUMN public.company_info.order_limit_message IS '제한 초과 시 표시할 메시지';

-- ============================================
-- 2. 대기자(Waitlist) 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 사용자 정보
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fcm_token TEXT, -- 푸시 알림용 토큰
  
  -- 상태
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'notified', 'cancelled'
  
  -- 요청 날짜 (해당 날짜의 접수 제한에 대한 알림 요청)
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- 알림 발송 정보
  notified_at TIMESTAMPTZ,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 같은 날짜에 같은 사용자가 중복 등록 방지
  UNIQUE(user_id, request_date)
);

COMMENT ON TABLE public.order_waitlist IS '주문 접수 대기자 목록 (접수 가능 시 푸시 알림 요청)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_order_waitlist_user_id ON public.order_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_order_waitlist_status ON public.order_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_order_waitlist_request_date ON public.order_waitlist(request_date);

-- RLS 활성화
ALTER TABLE public.order_waitlist ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 대기 정보만 조회 가능
CREATE POLICY "Users can view own waitlist"
  ON public.order_waitlist
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 대기 등록 가능
CREATE POLICY "Users can insert own waitlist"
  ON public.order_waitlist
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 사용자는 자신의 대기 취소 가능
CREATE POLICY "Users can update own waitlist"
  ON public.order_waitlist
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 서비스 역할은 모든 작업 가능
CREATE POLICY "Service role can manage waitlist"
  ON public.order_waitlist
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_order_waitlist_updated_at
  BEFORE UPDATE ON public.order_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 오늘 주문 수를 조회하는 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_today_order_count()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.orders
  WHERE DATE(created_at AT TIME ZONE 'Asia/Seoul') = DATE(NOW() AT TIME ZONE 'Asia/Seoul')
    AND status NOT IN ('CANCELLED');
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 주문 제한 상태 확인 함수
-- ============================================
CREATE OR REPLACE FUNCTION check_order_limit_status()
RETURNS JSONB AS $$
DECLARE
  v_limit INTEGER;
  v_message TEXT;
  v_today_count INTEGER;
  v_is_limited BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- 회사 설정에서 제한량 조회
  SELECT daily_order_limit, order_limit_message 
  INTO v_limit, v_message
  FROM public.company_info
  LIMIT 1;
  
  -- 제한이 설정되지 않은 경우 (NULL)
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'is_limited', FALSE,
      'daily_limit', NULL,
      'today_count', get_today_order_count(),
      'remaining', NULL,
      'message', NULL
    );
  END IF;
  
  -- 오늘 주문 수 조회
  v_today_count := get_today_order_count();
  
  -- 제한 초과 여부 확인
  v_is_limited := v_today_count >= v_limit;
  v_remaining := GREATEST(0, v_limit - v_today_count);
  
  RETURN jsonb_build_object(
    'is_limited', v_is_limited,
    'daily_limit', v_limit,
    'today_count', v_today_count,
    'remaining', v_remaining,
    'message', CASE WHEN v_is_limited THEN v_message ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 대기자 등록 함수
-- ============================================
CREATE OR REPLACE FUNCTION register_order_waitlist(
  p_user_id UUID,
  p_fcm_token TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_waitlist_id UUID;
  v_existing_id UUID;
BEGIN
  -- 이미 등록된 대기자인지 확인
  SELECT id INTO v_existing_id
  FROM public.order_waitlist
  WHERE user_id = p_user_id
    AND request_date = CURRENT_DATE
    AND status = 'waiting';
  
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'waitlist_id', v_existing_id,
      'message', '이미 알림 신청이 되어있습니다'
    );
  END IF;
  
  -- 대기자 등록
  INSERT INTO public.order_waitlist (user_id, fcm_token, request_date)
  VALUES (p_user_id, p_fcm_token, CURRENT_DATE)
  ON CONFLICT (user_id, request_date) 
  DO UPDATE SET 
    fcm_token = COALESCE(EXCLUDED.fcm_token, public.order_waitlist.fcm_token),
    status = 'waiting',
    updated_at = NOW()
  RETURNING id INTO v_waitlist_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'waitlist_id', v_waitlist_id,
    'message', '접수 가능할 때 알려드릴게요!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 대기자 알림 발송용 조회 함수 (Edge Function에서 사용)
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_waitlist_users(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  waitlist_id UUID,
  user_id UUID,
  fcm_token TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id as waitlist_id,
    w.user_id,
    COALESCE(w.fcm_token, u.fcm_token) as fcm_token,
    w.created_at
  FROM public.order_waitlist w
  JOIN public.users u ON u.id = w.user_id
  WHERE w.request_date = p_date
    AND w.status = 'waiting'
    AND COALESCE(w.fcm_token, u.fcm_token) IS NOT NULL
  ORDER BY w.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 대기자 알림 발송 완료 처리 함수
-- ============================================
CREATE OR REPLACE FUNCTION mark_waitlist_notified(p_waitlist_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.order_waitlist
  SET 
    status = 'notified',
    notified_at = NOW(),
    updated_at = NOW()
  WHERE id = ANY(p_waitlist_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. 오래된 대기자 자동 정리 (선택적)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_waitlist()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 3일 이상 지난 대기자 기록 삭제
  DELETE FROM public.order_waitlist
  WHERE request_date < CURRENT_DATE - INTERVAL '3 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. 알림 타입 추가 (notifications 테이블용)
-- ============================================
-- notification_type에 ORDER_AVAILABLE 추가 (이미 TEXT 타입이면 불필요)
-- 아래는 notifications.type이 TEXT인 경우를 가정

-- ============================================
-- 10. 대기자용 알림 템플릿 추가
-- ============================================
INSERT INTO public.notification_templates (type, title, body, is_active)
VALUES (
  'ORDER_AVAILABLE',
  '🎉 접수 가능해요!',
  '수선 서비스가 지금 접수 가능합니다. 지금 바로 신청해보세요!',
  TRUE
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  is_active = TRUE;

-- ============================================
-- 권한 부여
-- ============================================
GRANT EXECUTE ON FUNCTION get_today_order_count TO authenticated;
GRANT EXECUTE ON FUNCTION check_order_limit_status TO authenticated;
GRANT EXECUTE ON FUNCTION register_order_waitlist TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_waitlist_users TO service_role;
GRANT EXECUTE ON FUNCTION mark_waitlist_notified TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_waitlist TO service_role;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ 일일 주문 제한량 관리 시스템 설정 완료';
  RAISE NOTICE '   - company_info에 daily_order_limit 컬럼 추가됨';
  RAISE NOTICE '   - order_waitlist 테이블 생성됨';
  RAISE NOTICE '   - check_order_limit_status() - 제한 상태 확인';
  RAISE NOTICE '   - register_order_waitlist() - 대기자 등록';
  RAISE NOTICE '   - get_pending_waitlist_users() - 알림 대상 조회';
END $$;

