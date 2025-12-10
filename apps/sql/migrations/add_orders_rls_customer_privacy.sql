-- ============================================
-- 주문(orders) 테이블 고객 프라이버시 보호 RLS 정책
-- ============================================
-- 목적: 고객은 본인이 생성한 주문만 조회/수정/삭제 가능하도록 강제
-- 작성일: 2025-12-10
-- ============================================

-- 1. 기존 고객용 RLS 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can delete own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- 2. RLS 활성화 (이미 활성화되어 있을 수 있음)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. 🔒 새로운 RLS 정책: 고객 본인의 주문만 조회 가능
CREATE POLICY "Customers can view own orders"
  ON public.orders
  FOR SELECT
  USING (
    -- 현재 로그인한 사용자의 auth.uid()와 주문의 user_id가 일치하는 경우만 허용
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Customers can view own orders" ON public.orders IS 
'고객은 본인이 생성한 주문만 조회할 수 있습니다. auth.uid()와 users.auth_id가 일치하고, users.id와 orders.user_id가 일치하는 경우만 허용.';

-- 4. 🔒 새로운 RLS 정책: 고객 본인의 주문만 생성 가능
CREATE POLICY "Customers can insert own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    -- 주문 생성 시 user_id가 현재 로그인한 사용자의 ID와 일치하는 경우만 허용
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Customers can insert own orders" ON public.orders IS 
'고객은 본인의 user_id로만 주문을 생성할 수 있습니다. 다른 사용자의 user_id로 주문 생성 시도 차단.';

-- 5. 🔒 새로운 RLS 정책: 고객 본인의 주문만 수정 가능 (제한적)
CREATE POLICY "Customers can update own orders"
  ON public.orders
  FOR UPDATE
  USING (
    -- 기존 주문이 본인 소유인지 확인
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    -- 수정 후에도 본인 소유여야 함 (user_id 변경 불가)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Customers can update own orders" ON public.orders IS 
'고객은 본인의 주문만 수정할 수 있으며, 다른 사용자의 user_id로 변경 불가.';

-- 6. 🔒 새로운 RLS 정책: 고객 본인의 주문만 삭제 가능 (선택적)
-- 주의: 실제 운영 환경에서는 주문 삭제를 허용하지 않는 것이 일반적입니다.
-- 필요한 경우 주석을 제거하여 활성화하세요.
/*
CREATE POLICY "Customers can delete own orders"
  ON public.orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = orders.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Customers can delete own orders" ON public.orders IS 
'고객은 본인의 주문만 삭제할 수 있습니다. (운영 환경에서는 비활성화 권장)';
*/

-- 7. 관리자용 RLS 정책 (모든 주문 조회/수정 가능)
-- 기존 관리자 정책 삭제
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete all orders" ON public.orders;

-- 관리자는 모든 주문 조회 가능
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can view all orders" ON public.orders IS 
'관리자는 모든 주문을 조회할 수 있습니다.';

-- 관리자는 모든 주문 생성 가능
CREATE POLICY "Admins can insert all orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can insert all orders" ON public.orders IS 
'관리자는 모든 사용자의 주문을 생성할 수 있습니다.';

-- 관리자는 모든 주문 수정 가능
CREATE POLICY "Admins can update all orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can update all orders" ON public.orders IS 
'관리자는 모든 주문을 수정할 수 있습니다.';

-- 관리자는 모든 주문 삭제 가능 (선택적)
CREATE POLICY "Admins can delete all orders"
  ON public.orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can delete all orders" ON public.orders IS 
'관리자는 모든 주문을 삭제할 수 있습니다.';

-- 8. shipments 테이블에도 동일한 RLS 정책 적용
-- (주문과 연결된 배송 정보도 동일한 보안 수준 유지)
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Customers can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can view all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can insert all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update all shipments" ON public.shipments;

-- 고객은 본인 주문의 배송 정보만 조회 가능
CREATE POLICY "Customers can view own shipments"
  ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.users ON users.id = orders.user_id
      WHERE orders.id = shipments.order_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Customers can view own shipments" ON public.shipments IS 
'고객은 본인 주문에 연결된 배송 정보만 조회할 수 있습니다.';

-- 관리자는 모든 배송 정보 조회 가능
CREATE POLICY "Admins can view all shipments"
  ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

-- 관리자는 모든 배송 정보 생성 가능
CREATE POLICY "Admins can insert all shipments"
  ON public.shipments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

-- 관리자는 모든 배송 정보 수정 가능
CREATE POLICY "Admins can update all shipments"
  ON public.shipments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

-- 9. 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE '✅ 주문(orders) 테이블 고객 프라이버시 보호 RLS 정책 적용 완료';
  RAISE NOTICE '   - 고객은 본인의 주문만 조회/생성/수정 가능';
  RAISE NOTICE '   - 관리자는 모든 주문 조회/생성/수정/삭제 가능';
  RAISE NOTICE '   - shipments 테이블도 동일한 보안 수준 적용';
  RAISE NOTICE '   - 🔒 보안: auth.uid() 기반 소유자 검증 강제';
END $$;

