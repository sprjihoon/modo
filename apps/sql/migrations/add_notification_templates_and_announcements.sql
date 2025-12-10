-- ============================================
-- 알림 템플릿 관리 & 공지사항 시스템
-- ============================================
-- 작성일: 2025-12-10
-- 설명: 관리자가 알림 메시지를 커스터마이징하고 공지사항을 전체 발송

-- ============================================
-- 1. 알림 템플릿 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 템플릿 식별자 (고유)
  template_key TEXT NOT NULL UNIQUE,
  
  -- 템플릿 이름
  template_name TEXT NOT NULL,
  
  -- 카테고리
  category TEXT NOT NULL, -- 'order_status', 'extra_charge', 'announcement', 'custom'
  
  -- 알림 제목
  title TEXT NOT NULL,
  
  -- 알림 본문
  body TEXT NOT NULL,
  
  -- 활성화 여부
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 변수 설명 (JSON)
  variables JSONB DEFAULT '[]'::jsonb,
  -- 예: [{"name": "order_number", "description": "주문 번호"}]
  
  -- 기본 템플릿 여부 (시스템 기본값)
  is_default BOOLEAN DEFAULT FALSE,
  
  -- 메타데이터
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_templates IS '알림 메시지 템플릿 (관리자 편집 가능)';
COMMENT ON COLUMN public.notification_templates.template_key IS '템플릿 고유 키 (예: order_paid, order_booked)';
COMMENT ON COLUMN public.notification_templates.variables IS '사용 가능한 변수 목록';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON public.notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON public.notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON public.notification_templates(is_active);

-- RLS 활성화
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자는 활성화된 템플릿 조회 가능
CREATE POLICY "Everyone can view active templates"
  ON public.notification_templates
  FOR SELECT
  USING (is_active = TRUE);

-- 정책: 관리자는 모든 템플릿 조회/수정 가능
CREATE POLICY "Admins can manage all templates"
  ON public.notification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER')
    )
  );

-- ============================================
-- 2. 공지사항 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 제목
  title TEXT NOT NULL,
  
  -- 내용
  content TEXT NOT NULL,
  
  -- 공지 유형
  type TEXT NOT NULL DEFAULT 'general', -- 'general', 'urgent', 'maintenance', 'promotion'
  
  -- 발송 상태
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  
  -- 푸시 알림 발송 여부
  send_push BOOLEAN DEFAULT TRUE,
  
  -- 발송 대상
  target_audience TEXT DEFAULT 'all', -- 'all', 'active_users', 'recent_orders'
  
  -- 예약 발송 시각
  scheduled_at TIMESTAMPTZ,
  
  -- 실제 발송 시각
  sent_at TIMESTAMPTZ,
  
  -- 발송 통계
  total_recipients INTEGER DEFAULT 0,
  push_sent_count INTEGER DEFAULT 0,
  push_failed_count INTEGER DEFAULT 0,
  
  -- 이미지 URL (선택사항)
  image_url TEXT,
  
  -- 링크 URL (선택사항)
  link_url TEXT,
  
  -- 만료일 (선택사항)
  expires_at TIMESTAMPTZ,
  
  -- 고정 공지 여부
  is_pinned BOOLEAN DEFAULT FALSE,
  
  -- 작성자/발송자
  created_by UUID NOT NULL REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.announcements IS '공지사항 (푸시 알림 포함)';
COMMENT ON COLUMN public.announcements.type IS '공지 유형 (일반/긴급/점검/프로모션)';
COMMENT ON COLUMN public.announcements.status IS '발송 상태';
COMMENT ON COLUMN public.announcements.target_audience IS '발송 대상 (전체/활성 사용자/최근 주문자)';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled_at ON public.announcements(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_announcements_sent_at ON public.announcements(sent_at DESC);

-- RLS 활성화
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 정책: 고객은 발송된 공지사항만 조회 가능
CREATE POLICY "Users can view sent announcements"
  ON public.announcements
  FOR SELECT
  USING (
    status = 'sent' 
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- 정책: 관리자는 모든 공지사항 관리 가능
CREATE POLICY "Admins can manage all announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER')
    )
  );

-- ============================================
-- 3. 공지사항 읽음 표시 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(announcement_id, user_id)
);

COMMENT ON TABLE public.announcement_reads IS '공지사항 읽음 기록';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON public.announcement_reads(user_id);

-- RLS 활성화
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 읽음 기록만 조회/삽입 가능
CREATE POLICY "Users can manage own reads"
  ON public.announcement_reads
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- ============================================
-- 4. 기본 알림 템플릿 삽입
-- ============================================
INSERT INTO public.notification_templates (template_key, template_name, category, title, body, is_default, variables) VALUES
-- 주문 상태 템플릿
('order_paid', '결제 완료', 'order_status', '결제 완료', '주문({{order_number}})의 결제가 완료되었습니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_booked', '수거예약 완료', 'order_status', '수거예약 완료', '주문({{order_number}})의 수거예약이 완료되었습니다. 곧 방문 예정입니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_inbound', '입고 완료', 'order_status', '입고 완료', '주문({{order_number}})이 입고되었습니다. 곧 수선을 시작합니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_processing', '수선 중', 'order_status', '수선 중', '주문({{order_number}})의 수선 작업이 시작되었습니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_hold', '작업 대기', 'order_status', '작업 대기', '주문({{order_number}})이 일시 대기 중입니다. 확인이 필요합니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_ready_to_ship', '출고 완료', 'order_status', '출고 완료', '주문({{order_number}})의 수선이 완료되어 출고되었습니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_delivered', '배송 완료', 'order_status', '배송 완료', '주문({{order_number}})이 배송 완료되었습니다. 감사합니다!', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_return_pending', '반송 대기', 'order_status', '반송 대기', '주문({{order_number}})이 반송 대기 중입니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('order_cancelled', '주문 취소', 'order_status', '주문 취소', '주문({{order_number}})이 취소되었습니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),

-- 추가 과금 템플릿
('extra_charge_pending', '추가 결제 요청', 'extra_charge', '추가 결제 요청', '주문({{order_number}})에 추가 작업이 필요합니다. 추가 금액: {{price}}원', TRUE, '[{"name": "order_number", "description": "주문 번호"}, {"name": "price", "description": "추가 금액"}]'::jsonb),
('extra_charge_completed', '추가 결제 완료', 'extra_charge', '추가 결제 완료', '주문({{order_number}})의 추가 결제가 완료되었습니다. 작업을 재개합니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('extra_charge_skipped', '원안대로 진행', 'extra_charge', '원안대로 진행', '주문({{order_number}})을 추가 작업 없이 원안대로 진행합니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb),
('extra_charge_return', '반송 요청', 'extra_charge', '반송 요청', '주문({{order_number}})의 반송이 요청되었습니다.', TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- ============================================
-- 5. 템플릿 기반 메시지 생성 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_notification_from_template(
  p_template_key TEXT,
  p_variables JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_title TEXT;
  v_body TEXT;
  v_variable RECORD;
BEGIN
  -- 템플릿 조회
  SELECT title, body INTO v_template
  FROM public.notification_templates
  WHERE template_key = p_template_key
    AND is_active = TRUE
  LIMIT 1;

  IF v_template IS NULL THEN
    RETURN jsonb_build_object(
      'title', '알림',
      'body', '상태가 변경되었습니다.'
    );
  END IF;

  v_title := v_template.title;
  v_body := v_template.body;

  -- 변수 치환
  FOR v_variable IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_title := REPLACE(v_title, '{{' || v_variable.key || '}}', v_variable.value);
    v_body := REPLACE(v_body, '{{' || v_variable.key || '}}', v_variable.value);
  END LOOP;

  RETURN jsonb_build_object(
    'title', v_title,
    'body', v_body
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 전체 사용자 FCM 토큰 조회 함수
-- ============================================
CREATE OR REPLACE FUNCTION get_all_fcm_tokens(
  p_target_audience TEXT DEFAULT 'all'
) RETURNS TABLE (
  user_id UUID,
  fcm_token TEXT,
  email TEXT
) AS $$
BEGIN
  CASE p_target_audience
    WHEN 'all' THEN
      -- 모든 사용자 (FCM 토큰 있는)
      RETURN QUERY
      SELECT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('ADMIN', 'MANAGER', 'WORKER');
    
    WHEN 'active_users' THEN
      -- 최근 30일 내 활동한 사용자
      RETURN QUERY
      SELECT DISTINCT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('ADMIN', 'MANAGER', 'WORKER')
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.user_id = u.id
            AND o.created_at >= NOW() - INTERVAL '30 days'
        );
    
    WHEN 'recent_orders' THEN
      -- 최근 7일 내 주문한 사용자
      RETURN QUERY
      SELECT DISTINCT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('ADMIN', 'MANAGER', 'WORKER')
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.user_id = u.id
            AND o.created_at >= NOW() - INTERVAL '7 days'
        );
    
    ELSE
      -- 기본값: 모든 사용자
      RETURN QUERY
      SELECT u.id, u.fcm_token, u.email
      FROM public.users u
      WHERE u.fcm_token IS NOT NULL
        AND u.role NOT IN ('ADMIN', 'MANAGER', 'WORKER');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 공지사항 읽음 표시 함수
-- ============================================
CREATE OR REPLACE FUNCTION mark_announcement_as_read(
  p_announcement_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, p_user_id)
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. updated_at 트리거
-- ============================================
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. 권한 부여
-- ============================================
GRANT EXECUTE ON FUNCTION get_notification_from_template TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_fcm_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION mark_announcement_as_read TO authenticated;

-- ============================================
-- 10. 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ 알림 템플릿 & 공지사항 시스템 구축 완료';
  RAISE NOTICE '   - notification_templates 테이블 생성';
  RAISE NOTICE '   - announcements 테이블 생성';
  RAISE NOTICE '   - announcement_reads 테이블 생성';
  RAISE NOTICE '   - 기본 템플릿 13개 삽입';
  RAISE NOTICE '   - 헬퍼 함수 3개 생성';
  RAISE NOTICE '';
  RAISE NOTICE '📱 다음 단계:';
  RAISE NOTICE '   1. 관리자 페이지 - 템플릿 관리 UI';
  RAISE NOTICE '   2. 관리자 페이지 - 공지사항 작성/발송 UI';
  RAISE NOTICE '   3. Edge Function - 전체 푸시 발송';
  RAISE NOTICE '   4. 고객 앱 - 공지사항 목록/상세';
END $$;

