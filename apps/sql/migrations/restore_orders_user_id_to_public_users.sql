-- ============================================
-- orders.user_id 외래 키를 public.users로 복원
-- ============================================
-- 문제: orders.user_id가 auth.users를 참조하도록 변경되어 있음
-- 해결: public.users를 참조하도록 복원 (포인트 시스템과 호환성 유지)
--
-- 이유:
-- 1. point_transactions 테이블은 public.users.id를 참조
-- 2. 포인트 관리 시스템은 public.users.id 기반으로 동작
-- 3. 앱에서 auth_id로 public.users를 조회 후 해당 id 사용

-- 1. 기존 외래 키 제약 조건 삭제 (auth.users 참조하는 것)
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. 현재 orders.user_id가 auth_id인 경우, public.users.id로 변경
-- (이전에 auth.users.id를 직접 저장한 경우 수정)
UPDATE public.orders o
SET user_id = u.id
FROM public.users u
WHERE o.user_id = u.auth_id
AND o.user_id != u.id;

-- 3. public.users를 참조하는 새 외래 키 생성
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 4. 확인
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'orders_user_id_fkey';

-- 5. 매칭되지 않은 주문 확인
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM public.orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = o.user_id
  );
  
  IF unmatched_count > 0 THEN
    RAISE NOTICE '⚠️ 매칭되지 않은 주문: % 건 - 관리자 페이지에서 수동 연결 필요', unmatched_count;
  ELSE
    RAISE NOTICE '✅ 모든 주문이 public.users와 정상 매칭됨';
  END IF;
END $$;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ orders.user_id가 이제 public.users를 참조합니다!';
  RAISE NOTICE '📝 포인트 시스템과 호환성이 유지됩니다.';
END $$;

