-- ============================================
-- orders 테이블에 누락된 컬럼 추가
-- ============================================

-- 1. 고객 정보 컬럼 추가 (없으면)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 2. 주문 정보 컬럼 추가 (없으면)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS item_description TEXT;

-- 3. 주소 정보 컬럼 추가 (없으면)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS pickup_address_detail TEXT,
ADD COLUMN IF NOT EXISTS pickup_zipcode TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_detail TEXT,
ADD COLUMN IF NOT EXISTS delivery_zipcode TEXT;

-- 4. 요청사항 컬럼 추가 (없으면)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ orders 테이블에 누락된 컬럼이 추가되었습니다!';
  RAISE NOTICE '📝 이제 주문 생성이 정상 작동합니다.';
END $$;

