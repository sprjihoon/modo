-- ============================================
-- order_status에 OUT_FOR_DELIVERY(배송중) 추가
-- ============================================
-- 작성일: 2026-07-06
-- 설명:
--   shipment_status 에는 이미 OUT_FOR_DELIVERY 가 있으나 order_status 에는 없어
--   출고완료(READY_TO_SHIP) → 배송중(OUT_FOR_DELIVERY) → 배송완료(DELIVERED)
--   흐름에서 orders.status 를 OUT_FOR_DELIVERY 로 업데이트하면 enum 오류가 발생함.
--   ops 출고 발송 처리 / 대시보드 상태 변경 / 고객 웹 표시가 모두 이 값을 전제하므로
--   order_status enum 에 값을 추가하여 스키마-코드 정합성을 맞춘다.
--
-- 주의: PostgreSQL 12+ 는 ALTER TYPE ... ADD VALUE 가 트랜잭션 블록 밖에서 커밋되어야
--       바로 사용 가능하다. Supabase SQL 에디터에서는 단일 실행으로 문제없다.

-- 1. order_status 에 OUT_FOR_DELIVERY 추가 (READY_TO_SHIP 뒤)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'OUT_FOR_DELIVERY'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'OUT_FOR_DELIVERY' AFTER 'READY_TO_SHIP';
    RAISE NOTICE '✅ order_status에 OUT_FOR_DELIVERY 추가 완료';
  ELSE
    RAISE NOTICE '⚠️ OUT_FOR_DELIVERY는 이미 존재함';
  END IF;
END $$;

-- 2. 배송중 알림 템플릿 추가 (없으면)
INSERT INTO public.notification_templates
  (template_key, template_name, category, title, body, is_default, variables)
VALUES
  ('order_out_for_delivery', '배송 시작', 'order_status', '배송 시작',
   '주문({{order_number}})의 수선이 완료되어 고객님께 배송을 시작했습니다.',
   TRUE, '[{"name": "order_number", "description": "주문 번호"}]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- 완료 로그
DO $$ BEGIN
  RAISE NOTICE '✅ OUT_FOR_DELIVERY 마이그레이션 완료';
  RAISE NOTICE '   - order_status: OUT_FOR_DELIVERY 추가';
  RAISE NOTICE '   - 알림 템플릿 order_out_for_delivery upsert';
END $$;
