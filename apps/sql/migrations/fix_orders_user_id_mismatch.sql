-- ============================================
-- 주문 테이블의 user_id 불일치 수정
-- ============================================
-- 문제: orders.user_id에 auth.users.id가 저장되어 있음
-- 해결: public.users.id로 변경 (auth_id 기준으로만 매칭)

-- 1. 임시로 user_id 제약조건 제거
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. user_id를 auth_id 기준으로 public.users.id로 변경
-- orders.user_id가 실제로는 auth_id인 경우를 찾아서 수정
UPDATE public.orders o
SET user_id = u.id
FROM public.users u
WHERE o.user_id = u.auth_id
AND o.user_id != u.id;

-- 3. 제약조건 다시 추가
ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 4. 매칭되지 않은 주문 확인 (로그용)
DO $$
DECLARE
  unmatched_count INTEGER;
  unmatched_orders TEXT;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM public.orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = o.user_id
  );
  
  IF unmatched_count > 0 THEN
    -- 매칭되지 않은 주문의 ID들 가져오기
    SELECT string_agg(id::text, ', ') INTO unmatched_orders
    FROM (
      SELECT o.id
      FROM public.orders o
      WHERE NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = o.user_id
      )
      LIMIT 10
    ) sub;
    
    RAISE NOTICE '⚠️ 매칭되지 않은 주문: % 건', unmatched_count;
    RAISE NOTICE '   예시 주문 ID: %', unmatched_orders;
    RAISE NOTICE '   → 관리자 페이지에서 수동으로 사용자 연결이 필요합니다.';
  ELSE
    RAISE NOTICE '✅ 모든 주문이 정상적으로 매칭되었습니다.';
  END IF;
END $$;

-- 주석
COMMENT ON CONSTRAINT orders_user_id_fkey ON public.orders IS 'public.users 테이블 참조 (auth_id 기준으로 매칭, 이메일은 변경 가능하므로 사용 안 함)';

