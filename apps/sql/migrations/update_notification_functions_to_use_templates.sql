-- ============================================
-- 알림 함수를 템플릿 테이블 사용하도록 수정
-- ============================================
-- 작성일: 2026-01-15
-- 설명: get_notification_message, get_extra_charge_notification_message 함수가
--       notification_templates 테이블에서 메시지를 가져오도록 수정
--       (관리자 페이지에서 편집한 메시지가 실제 푸시에 반영됨)

-- ============================================
-- 1. 주문 상태 알림 메시지 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION get_notification_message(
  p_status TEXT,
  p_order_number TEXT
) RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_template_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- 상태를 템플릿 키로 변환
  v_template_key := 'order_' || LOWER(p_status);
  
  -- 템플릿 테이블에서 조회
  SELECT title, body INTO v_template
  FROM public.notification_templates
  WHERE template_key = v_template_key
    AND is_active = TRUE
  LIMIT 1;

  -- 템플릿이 있으면 변수 치환
  IF v_template IS NOT NULL THEN
    v_title := v_template.title;
    v_body := REPLACE(v_template.body, '{{order_number}}', COALESCE(p_order_number, 'N/A'));
    
    RETURN jsonb_build_object(
      'title', v_title,
      'body', v_body
    );
  END IF;

  -- 템플릿이 없으면 폴백 (하드코딩된 기본값)
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

COMMENT ON FUNCTION get_notification_message IS '주문 상태 변경 알림 메시지 생성 (템플릿 테이블 우선 사용)';

-- ============================================
-- 2. 추가 과금 알림 메시지 함수 수정
-- ============================================
CREATE OR REPLACE FUNCTION get_extra_charge_notification_message(
  p_extra_charge_status TEXT,
  p_order_number TEXT,
  p_price INTEGER DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_template_key TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- 상태를 템플릿 키로 변환
  CASE p_extra_charge_status
    WHEN 'PENDING_CUSTOMER' THEN v_template_key := 'extra_charge_pending';
    WHEN 'COMPLETED' THEN v_template_key := 'extra_charge_completed';
    WHEN 'SKIPPED' THEN v_template_key := 'extra_charge_skipped';
    WHEN 'RETURN_REQUESTED' THEN v_template_key := 'extra_charge_return';
    ELSE v_template_key := NULL;
  END CASE;
  
  -- 템플릿 테이블에서 조회
  IF v_template_key IS NOT NULL THEN
    SELECT title, body INTO v_template
    FROM public.notification_templates
    WHERE template_key = v_template_key
      AND is_active = TRUE
    LIMIT 1;
  END IF;

  -- 템플릿이 있으면 변수 치환
  IF v_template IS NOT NULL THEN
    v_title := v_template.title;
    v_body := REPLACE(v_template.body, '{{order_number}}', COALESCE(p_order_number, 'N/A'));
    v_body := REPLACE(v_body, '{{price}}', COALESCE(p_price::TEXT, '0'));
    
    -- 천 단위 콤마 포맷 (선택적)
    IF p_price IS NOT NULL THEN
      v_body := REPLACE(v_body, p_price::TEXT || '원', TO_CHAR(p_price, 'FM999,999,999') || '원');
    END IF;
    
    RETURN jsonb_build_object(
      'title', v_title,
      'body', v_body
    );
  END IF;

  -- 템플릿이 없으면 폴백 (하드코딩된 기본값)
  CASE p_extra_charge_status
    WHEN 'PENDING_CUSTOMER' THEN
      v_title := '추가 결제 요청';
      IF p_price IS NOT NULL THEN
        v_body := '주문(' || p_order_number || ')에 추가 작업이 필요합니다. 추가 금액: ' || TO_CHAR(p_price, 'FM999,999,999') || '원';
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

COMMENT ON FUNCTION get_extra_charge_notification_message IS '추가 과금 알림 메시지 생성 (템플릿 테이블 우선 사용)';

-- ============================================
-- 3. 권한 부여
-- ============================================
GRANT EXECUTE ON FUNCTION get_notification_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_extra_charge_notification_message TO authenticated;

-- ============================================
-- 4. 완료 메시지
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ 알림 함수 업데이트 완료';
  RAISE NOTICE '   - get_notification_message: 템플릿 테이블 우선 사용';
  RAISE NOTICE '   - get_extra_charge_notification_message: 템플릿 테이블 우선 사용';
  RAISE NOTICE '';
  RAISE NOTICE '📱 이제 관리자 페이지에서 수정한 메시지가 실제 푸시에 반영됩니다!';
  RAISE NOTICE '   관리자 페이지: /dashboard/notifications/templates';
END $$;

