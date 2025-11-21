-- ============================================
-- orders 테이블에 전화번호 컬럼 추가
-- ============================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pickup_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_phone TEXT;

-- 확인
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND column_name IN ('pickup_phone', 'delivery_phone', 'customer_phone');

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ 전화번호 컬럼이 추가되었습니다!';
END $$;

