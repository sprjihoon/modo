-- ============================================
-- 수거일 알림 템플릿 추가
-- ============================================
-- 작성일: 2026-01-18
-- 설명: D-1 수거 알림, 당일 수거 알림 템플릿 추가
-- 변수: {{pickup_date}} - 수거 예정일 (예: 1월 20일)

-- 1. D-1 수거 알림 템플릿 (내일 수거 예정)
INSERT INTO notification_templates (
  template_key,
  template_name,
  category,
  title,
  body,
  is_active,
  is_default,
  variables
) VALUES (
  'pickup_reminder_d1',
  'D-1 수거 알림',
  'pickup_reminder',
  '📦 내일 수거 예정',
  '{{pickup_date}} 의류 수거가 예정되어 있습니다. 의류를 준비해주세요!',
  true,
  true,
  '[{"name": "pickup_date", "description": "수거 예정일 (예: 1월 20일)"}]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- 2. 당일 수거 알림 템플릿 (오늘 수거)
INSERT INTO notification_templates (
  template_key,
  template_name,
  category,
  title,
  body,
  is_active,
  is_default,
  variables
) VALUES (
  'pickup_reminder_today',
  '당일 수거 알림',
  'pickup_reminder',
  '🚚 오늘 수거일입니다',
  '택배기사님이 방문 예정입니다. 문 앞에 의류를 준비해주세요!',
  true,
  true,
  '[]'::jsonb
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ 수거일 알림 템플릿 추가 완료';
  RAISE NOTICE '   - pickup_reminder_d1: D-1 수거 알림';
  RAISE NOTICE '   - pickup_reminder_today: 당일 수거 알림';
  RAISE NOTICE '   - 관리자 페이지에서 메시지 수정 가능';
END $$;

