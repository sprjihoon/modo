-- ============================================
-- orders 테이블 user_id 외래 키 수정
-- public.users 대신 auth.users 참조하도록 변경
-- ============================================

-- 1. 기존 외래 키 제약 조건 삭제
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. auth.users를 참조하는 새 외래 키 생성
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 3. 확인
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'orders_user_id_fkey';

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ orders.user_id가 이제 auth.users를 참조합니다!';
  RAISE NOTICE '📝 앱에서 주문 생성이 정상 작동합니다.';
END $$;

