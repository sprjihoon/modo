-- ============================================
-- 카카오 알림톡 템플릿 및 발송 이력 테이블
-- ============================================
-- 작성일: 2026-01-21
-- 설명: 카카오 알림톡 연동을 위한 템플릿 관리 및 발송 이력 테이블

-- ============================================
-- 1. 알림톡 템플릿 테이블
-- ============================================
-- 카카오 비즈니스 채널에서 승인받은 템플릿을 관리
CREATE TABLE IF NOT EXISTS public.alimtalk_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 템플릿 식별 정보
  template_code TEXT NOT NULL UNIQUE,    -- 카카오에서 승인받은 템플릿 코드
  template_name TEXT NOT NULL,           -- 관리용 이름
  
  -- 템플릿 분류
  category TEXT NOT NULL DEFAULT 'order', -- 'order', 'extra_charge', 'pickup', 'announcement'
  
  -- 템플릿 내용 (미리보기/참조용, 실제 발송은 카카오 템플릿 사용)
  title TEXT,                            -- 알림 제목 (앱 알림과 매핑)
  content TEXT NOT NULL,                 -- 템플릿 내용 (변수 포함)
  
  -- 변수 정보
  variables JSONB DEFAULT '[]'::jsonb,   -- [{name, description, example}]
  
  -- 버튼 정보
  buttons JSONB DEFAULT '[]'::jsonb,     -- [{name, type, url_mobile, url_pc}]
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,        -- 활성화 여부
  kakao_approved BOOLEAN DEFAULT FALSE,  -- 카카오 승인 여부
  kakao_approved_at TIMESTAMPTZ,         -- 승인일시
  
  -- 연결된 앱 알림 템플릿
  linked_notification_template TEXT,     -- notification_templates.template_key
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.alimtalk_templates IS '카카오 알림톡 템플릿 관리';
COMMENT ON COLUMN public.alimtalk_templates.template_code IS '카카오에서 승인받은 템플릿 코드';
COMMENT ON COLUMN public.alimtalk_templates.linked_notification_template IS '연결된 앱 내 알림 템플릿 키';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_alimtalk_templates_category ON public.alimtalk_templates(category);
CREATE INDEX IF NOT EXISTS idx_alimtalk_templates_is_active ON public.alimtalk_templates(is_active);

-- RLS
ALTER TABLE public.alimtalk_templates ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admin can manage alimtalk templates"
  ON public.alimtalk_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Service role 전체 접근
CREATE POLICY "Service role full access to alimtalk templates"
  ON public.alimtalk_templates
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. 알림톡 발송 이력 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.alimtalk_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 발송 대상 정보
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,            -- 발송 전화번호 (마스킹 저장)
  
  -- 템플릿 정보
  template_code TEXT NOT NULL,
  template_variables JSONB DEFAULT '{}'::jsonb,
  
  -- 발송 결과
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  message_id TEXT,                       -- 카카오 발송 ID
  error_code TEXT,
  error_message TEXT,
  
  -- 타임스탬프
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.alimtalk_logs IS '카카오 알림톡 발송 이력';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_user_id ON public.alimtalk_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_order_id ON public.alimtalk_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_status ON public.alimtalk_logs(status);
CREATE INDEX IF NOT EXISTS idx_alimtalk_logs_created_at ON public.alimtalk_logs(created_at DESC);

-- RLS
ALTER TABLE public.alimtalk_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admin can view alimtalk logs"
  ON public.alimtalk_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Service role 전체 접근
CREATE POLICY "Service role full access to alimtalk logs"
  ON public.alimtalk_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. 사용자 테이블에 알림톡 수신 동의 컬럼 추가
-- ============================================
DO $$
BEGIN
  -- 알림톡 수신 동의 컬럼
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'alimtalk_agreed'
  ) THEN
    ALTER TABLE public.users ADD COLUMN alimtalk_agreed BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN public.users.alimtalk_agreed IS '카카오 알림톡 수신 동의 여부';
  END IF;
  
  -- 알림톡 동의일시
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'alimtalk_agreed_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN alimtalk_agreed_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.users.alimtalk_agreed_at IS '알림톡 수신 동의 일시';
  END IF;
END $$;

-- ============================================
-- 4. 기본 알림톡 템플릿 데이터 삽입
-- ============================================
-- 주문 상태 알림 템플릿
INSERT INTO public.alimtalk_templates (
  template_code, template_name, category, title, content, variables, linked_notification_template
) VALUES 
-- 결제 완료
(
  'MODO_ORDER_PAID',
  '결제 완료 알림',
  'order',
  '결제 완료',
  '[모두의 수선] 결제 완료

#{고객명}님, 주문이 완료되었습니다.

■ 주문번호: #{주문번호}
■ 결제금액: #{결제금액}원

수거 예약 후 택배 기사님이 방문합니다.
감사합니다!',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}, {"name": "결제금액", "description": "결제 금액"}]'::jsonb,
  'order_paid'
),
-- 수거 예약 완료
(
  'MODO_ORDER_BOOKED',
  '수거 예약 완료 알림',
  'order',
  '수거예약 완료',
  '[모두의 수선] 수거 예약 완료

#{고객명}님, 수거 예약이 완료되었습니다.

■ 주문번호: #{주문번호}
■ 수거예정일: #{수거일}

택배 기사님이 방문 예정입니다.
의류를 문 앞에 준비해 주세요!',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}, {"name": "수거일", "description": "수거 예정일"}]'::jsonb,
  'order_booked'
),
-- 입고 완료
(
  'MODO_ORDER_INBOUND',
  '입고 완료 알림',
  'order',
  '입고 완료',
  '[모두의 수선] 입고 완료

#{고객명}님의 의류가 입고되었습니다.

■ 주문번호: #{주문번호}

곧 수선 작업을 시작합니다.
완료되면 다시 안내드릴게요!',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}]'::jsonb,
  'order_inbound'
),
-- 수선 시작
(
  'MODO_ORDER_PROCESSING',
  '수선 시작 알림',
  'order',
  '수선 중',
  '[모두의 수선] 수선 시작

#{고객명}님의 의류 수선을 시작합니다.

■ 주문번호: #{주문번호}

정성껏 수선하여 보내드릴게요!',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}]'::jsonb,
  'order_processing'
),
-- 출고 완료
(
  'MODO_ORDER_READY',
  '출고 완료 알림',
  'order',
  '출고 완료',
  '[모두의 수선] 출고 완료

#{고객명}님의 수선이 완료되어 출고되었습니다!

■ 주문번호: #{주문번호}
■ 송장번호: #{송장번호}

빠른 시일 내에 받아보실 수 있습니다.',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}, {"name": "송장번호", "description": "배송 송장번호"}]'::jsonb,
  'order_ready_to_ship'
),
-- 배송 완료
(
  'MODO_ORDER_DELIVERED',
  '배송 완료 알림',
  'order',
  '배송 완료',
  '[모두의 수선] 배송 완료

#{고객명}님, 배송이 완료되었습니다!

■ 주문번호: #{주문번호}

이용해 주셔서 감사합니다.
만족스러우셨다면 리뷰 부탁드려요! 💙',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}]'::jsonb,
  'order_delivered'
),
-- 추가 결제 요청
(
  'MODO_EXTRA_CHARGE',
  '추가 결제 요청 알림',
  'extra_charge',
  '추가 결제 요청',
  '[모두의 수선] 추가 결제 안내

#{고객명}님, 의류 검수 중 추가 작업이 필요합니다.

■ 주문번호: #{주문번호}
■ 추가금액: #{추가금액}원

앱에서 확인 후 진행 여부를 선택해 주세요.',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "주문번호", "description": "주문 번호"}, {"name": "추가금액", "description": "추가 결제 금액"}]'::jsonb,
  'extra_charge_pending'
),
-- 수거 D-1 알림
(
  'MODO_PICKUP_D1',
  '수거 D-1 알림',
  'pickup',
  '📦 내일 수거 예정',
  '[모두의 수선] 내일 수거 예정

#{고객명}님, 내일 의류 수거가 예정되어 있습니다.

■ 수거예정일: #{수거일}

의류를 문 앞에 준비해 주세요!',
  '[{"name": "고객명", "description": "고객 이름"}, {"name": "수거일", "description": "수거 예정일"}]'::jsonb,
  'pickup_reminder_d1'
),
-- 수거 당일 알림
(
  'MODO_PICKUP_TODAY',
  '수거 당일 알림',
  'pickup',
  '🚚 오늘 수거일입니다',
  '[모두의 수선] 오늘 수거일입니다

#{고객명}님, 오늘 택배 기사님이 방문합니다.

의류를 문 앞에 준비해 주세요!
방문 전 연락드릴 예정입니다.',
  '[{"name": "고객명", "description": "고객 이름"}]'::jsonb,
  'pickup_reminder_today'
)
ON CONFLICT (template_code) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  linked_notification_template = EXCLUDED.linked_notification_template,
  updated_at = NOW();

-- ============================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================
CREATE TRIGGER update_alimtalk_templates_updated_at
  BEFORE UPDATE ON public.alimtalk_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 알림톡 발송 함수
-- ============================================
CREATE OR REPLACE FUNCTION log_alimtalk_send(
  p_user_id UUID,
  p_order_id UUID,
  p_phone_number TEXT,
  p_template_code TEXT,
  p_template_variables JSONB,
  p_status TEXT DEFAULT 'pending',
  p_message_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_masked_phone TEXT;
BEGIN
  -- 전화번호 마스킹 (중간 4자리)
  v_masked_phone := SUBSTRING(p_phone_number, 1, 3) || '****' || SUBSTRING(p_phone_number, LENGTH(p_phone_number) - 3, 4);
  
  INSERT INTO public.alimtalk_logs (
    user_id, order_id, phone_number, template_code, template_variables,
    status, message_id, error_code, error_message,
    sent_at
  ) VALUES (
    p_user_id, p_order_id, v_masked_phone, p_template_code, p_template_variables,
    p_status, p_message_id, p_error_code, p_error_message,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_alimtalk_send IS '알림톡 발송 이력 기록';

-- 권한 부여
GRANT EXECUTE ON FUNCTION log_alimtalk_send TO service_role;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ 카카오 알림톡 테이블 생성 완료';
  RAISE NOTICE '   - alimtalk_templates: 템플릿 관리 테이블';
  RAISE NOTICE '   - alimtalk_logs: 발송 이력 테이블';
  RAISE NOTICE '   - users.alimtalk_agreed: 수신 동의 컬럼';
  RAISE NOTICE '';
  RAISE NOTICE '📱 다음 단계:';
  RAISE NOTICE '   1. 카카오 비즈니스 채널에서 템플릿 등록 및 승인';
  RAISE NOTICE '   2. 환경변수 설정 (KAKAO_BIZM_SENDER_KEY, KAKAO_BIZM_API_KEY)';
  RAISE NOTICE '   3. 템플릿 코드 확인 후 alimtalk_templates 업데이트';
END $$;

