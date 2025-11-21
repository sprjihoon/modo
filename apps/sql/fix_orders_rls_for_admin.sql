-- ============================================
-- orders 테이블 RLS 정책 수정
-- 관리자 페이지에서 모든 주문 조회 가능하도록
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;

-- 1. 인증된 사용자는 자신의 주문 조회 가능
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. 인증된 사용자는 자신의 주문 생성 가능
CREATE POLICY "Users can insert own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. 인증된 사용자는 자신의 주문 수정 가능
CREATE POLICY "Users can update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. 관리자는 모든 주문 조회 가능 (개발 중에는 모든 인증 사용자)
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (true);  -- 개발 중에는 모든 인증 사용자가 조회 가능

-- 5. 관리자는 모든 주문 수정 가능 (개발 중에는 모든 인증 사용자)
CREATE POLICY "Admins can update all orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 확인: 현재 주문 개수
SELECT COUNT(*) as total_orders FROM public.orders;

-- 최근 주문 5개
SELECT 
  order_number,
  customer_name,
  item_name,
  total_price,
  status,
  tracking_no,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 5;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ orders 테이블 RLS 정책이 수정되었습니다!';
  RAISE NOTICE '📝 관리자 페이지에서 모든 주문을 볼 수 있습니다.';
END $$;

