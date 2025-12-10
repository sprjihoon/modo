-- ============================================
-- 전체 앱 데이터 프라이버시 및 접근 제어 RLS 정책 (종합)
-- ============================================
-- 목적: 모든 개인 데이터(주문, 배송지, 결제, 프로필, 포인트 등)에 대해
--       철저한 데이터 격리(Data Isolation) 적용
-- 작성일: 2025-12-10
-- 핵심 원칙:
--   1. 고객(User): userId가 자신의 uid와 일치하는 데이터만 읽고 쓸 수 있음
--   2. 관리자(Admin): 업무 처리를 위해 모든 유저의 데이터를 읽고 쓸 수 있음 (role == 'ADMIN')
-- ============================================

-- ============================================
-- 1. users 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- RLS 활성화 (이미 활성화되어 있을 수 있음)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 🔒 정책: 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

COMMENT ON POLICY "Users can view own profile" ON public.users IS 
'사용자는 본인의 프로필만 조회할 수 있습니다. auth.uid()와 auth_id가 일치하는 경우만 허용.';

-- 🔒 정책: 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

COMMENT ON POLICY "Users can update own profile" ON public.users IS 
'사용자는 본인의 프로필만 수정할 수 있으며, auth_id 변경 불가.';

-- 🔒 정책: 사용자는 자신의 프로필을 생성 가능 (회원가입 시)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

COMMENT ON POLICY "Users can insert own profile" ON public.users IS 
'사용자는 본인의 auth_id로만 프로필을 생성할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 사용자 프로필 조회 가능
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can view all users" ON public.users IS 
'관리자는 모든 사용자 프로필을 조회할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 사용자 프로필 수정 가능
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can update all users" ON public.users IS 
'관리자는 모든 사용자 프로필을 수정할 수 있습니다.';

-- ============================================
-- 2. addresses 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses;

-- RLS 활성화
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 🔒 정책: 사용자는 자신의 배송지만 조회 가능
CREATE POLICY "Users can view own addresses"
  ON public.addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = addresses.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view own addresses" ON public.addresses IS 
'사용자는 본인의 배송지만 조회할 수 있습니다.';

-- 🔒 정책: 사용자는 자신의 배송지만 추가 가능
CREATE POLICY "Users can insert own addresses"
  ON public.addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = addresses.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can insert own addresses" ON public.addresses IS 
'사용자는 본인의 user_id로만 배송지를 추가할 수 있습니다.';

-- 🔒 정책: 사용자는 자신의 배송지만 수정 가능
CREATE POLICY "Users can update own addresses"
  ON public.addresses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = addresses.user_id
        AND users.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = addresses.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can update own addresses" ON public.addresses IS 
'사용자는 본인의 배송지만 수정할 수 있으며, user_id 변경 불가.';

-- 🔒 정책: 사용자는 자신의 배송지만 삭제 가능
CREATE POLICY "Users can delete own addresses"
  ON public.addresses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = addresses.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can delete own addresses" ON public.addresses IS 
'사용자는 본인의 배송지만 삭제할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 배송지 조회/생성/수정/삭제 가능
CREATE POLICY "Admins can manage all addresses"
  ON public.addresses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can manage all addresses" ON public.addresses IS 
'관리자는 모든 배송지를 조회/생성/수정/삭제할 수 있습니다.';

-- ============================================
-- 3. payments 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete all payments" ON public.payments;

-- RLS 활성화
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 🔒 정책: 사용자는 자신의 주문에 대한 결제 정보만 조회 가능
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.users ON users.id = orders.user_id
      WHERE orders.id = payments.order_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view own payments" ON public.payments IS 
'사용자는 본인 주문에 대한 결제 정보만 조회할 수 있습니다.';

-- 🔒 정책: 사용자는 자신의 주문에 대한 결제 정보만 생성 가능
CREATE POLICY "Users can insert own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.users ON users.id = orders.user_id
      WHERE orders.id = payments.order_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can insert own payments" ON public.payments IS 
'사용자는 본인 주문에 대한 결제 정보만 생성할 수 있습니다.';

-- 🔒 정책: 사용자는 자신의 주문에 대한 결제 정보 수정 불가 (보안상 이유)
-- 결제 정보는 일반적으로 생성 후 수정하지 않지만, 필요시 관리자만 수정 가능하도록 설정

-- 🔑 정책: 관리자는 모든 결제 정보 조회 가능
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can view all payments" ON public.payments IS 
'관리자는 모든 결제 정보를 조회할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 결제 정보 생성 가능
CREATE POLICY "Admins can insert all payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can insert all payments" ON public.payments IS 
'관리자는 모든 결제 정보를 생성할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 결제 정보 수정 가능
CREATE POLICY "Admins can update all payments"
  ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can update all payments" ON public.payments IS 
'관리자는 모든 결제 정보를 수정할 수 있습니다.';

-- 🔑 정책: 관리자는 모든 결제 정보 삭제 가능 (신중하게 사용)
CREATE POLICY "Admins can delete all payments"
  ON public.payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can delete all payments" ON public.payments IS 
'관리자는 모든 결제 정보를 삭제할 수 있습니다. (신중하게 사용)';

-- ============================================
-- 4. point_transactions 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins can view all point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins can insert point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins can update point transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Admins can delete point transactions" ON public.point_transactions;

-- RLS 활성화
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 🔒 정책: 사용자는 자신의 포인트 거래 내역만 조회 가능
CREATE POLICY "Users can view own point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = point_transactions.user_id
        AND users.auth_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view own point transactions" ON public.point_transactions IS 
'사용자는 본인의 포인트 거래 내역만 조회할 수 있습니다.';

-- 🔒 정책: 사용자는 포인트 거래 내역을 직접 생성할 수 없음 (보안상 중요!)
-- 포인트는 시스템(트리거, 함수) 또는 관리자만 조작 가능

-- 🔑 정책: 관리자는 모든 포인트 거래 내역 조회 가능
CREATE POLICY "Admins can view all point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can view all point transactions" ON public.point_transactions IS 
'관리자는 모든 포인트 거래 내역을 조회할 수 있습니다.';

-- 🔑 정책: 관리자는 포인트 거래 내역 생성 가능
CREATE POLICY "Admins can insert point transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can insert point transactions" ON public.point_transactions IS 
'관리자는 포인트 거래 내역을 생성할 수 있습니다. (수동 적립/차감)';

-- 🔑 정책: 관리자는 포인트 거래 내역 수정 가능 (일반적으로 필요 없음)
CREATE POLICY "Admins can update point transactions"
  ON public.point_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can update point transactions" ON public.point_transactions IS 
'관리자는 포인트 거래 내역을 수정할 수 있습니다. (일반적으로 사용하지 않음)';

-- 🔑 정책: 관리자는 포인트 거래 내역 삭제 가능 (신중하게 사용)
CREATE POLICY "Admins can delete point transactions"
  ON public.point_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can delete point transactions" ON public.point_transactions IS 
'관리자는 포인트 거래 내역을 삭제할 수 있습니다. (신중하게 사용)';

-- ============================================
-- 5. point_settings 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view active point settings" ON public.point_settings;
DROP POLICY IF EXISTS "Admins can manage point settings" ON public.point_settings;

-- RLS 활성화
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

-- 🔒 정책: 모든 사용자가 활성화된 포인트 설정 조회 가능 (공개 정보)
CREATE POLICY "Users can view active point settings"
  ON public.point_settings
  FOR SELECT
  USING (is_active = TRUE);

COMMENT ON POLICY "Users can view active point settings" ON public.point_settings IS 
'모든 사용자가 활성화된 포인트 설정을 조회할 수 있습니다. (공개 정보)';

-- 🔑 정책: 관리자는 모든 포인트 설정 조회/생성/수정/삭제 가능
CREATE POLICY "Admins can manage point settings"
  ON public.point_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );

COMMENT ON POLICY "Admins can manage point settings" ON public.point_settings IS 
'관리자는 모든 포인트 설정을 조회/생성/수정/삭제할 수 있습니다.';

-- ============================================
-- 6. notifications 테이블 RLS 정책 (존재하는 경우)
-- ============================================

-- notifications 테이블이 있는지 확인하고 RLS 정책 적용
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- 기존 정책 삭제
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
    
    -- RLS 활성화
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    -- 🔒 정책: 사용자는 자신의 알림만 조회 가능
    EXECUTE 'CREATE POLICY "Users can view own notifications"
      ON public.notifications
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = notifications.user_id
            AND users.auth_id = auth.uid()
        )
      )';
    
    -- 🔒 정책: 사용자는 자신의 알림만 수정 가능 (읽음 표시 등)
    EXECUTE 'CREATE POLICY "Users can update own notifications"
      ON public.notifications
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = notifications.user_id
            AND users.auth_id = auth.uid()
        )
      )';
    
    -- 🔒 정책: 사용자는 자신의 알림만 삭제 가능
    EXECUTE 'CREATE POLICY "Users can delete own notifications"
      ON public.notifications
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = notifications.user_id
            AND users.auth_id = auth.uid()
        )
      )';
    
    -- 🔑 정책: 관리자는 모든 알림 조회/생성/수정/삭제 가능
    EXECUTE 'CREATE POLICY "Admins can manage all notifications"
      ON public.notifications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.auth_id = auth.uid()
            AND users.role = ''ADMIN''
        )
      )';
    
    RAISE NOTICE '✅ notifications 테이블 RLS 정책 적용 완료';
  ELSE
    RAISE NOTICE '⏭️ notifications 테이블이 없습니다. 건너뜁니다.';
  END IF;
END $$;

-- ============================================
-- 7. 마이그레이션 완료 로그
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ 전체 앱 데이터 프라이버시 보호 RLS 정책 적용 완료';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 적용된 테이블:';
  RAISE NOTICE '   1. users (프로필)';
  RAISE NOTICE '   2. addresses (배송지)';
  RAISE NOTICE '   3. payments (결제 정보)';
  RAISE NOTICE '   4. point_transactions (포인트 거래 내역)';
  RAISE NOTICE '   5. point_settings (포인트 설정)';
  RAISE NOTICE '   6. notifications (알림) - 존재하는 경우';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 핵심 보안 원칙:';
  RAISE NOTICE '   - 고객: userId가 자신의 uid와 일치하는 데이터만 접근';
  RAISE NOTICE '   - 관리자: role = ''ADMIN''인 경우 모든 데이터 접근';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 보안 강화 사항:';
  RAISE NOTICE '   - 모든 개인 데이터에 대해 소유자 기반 접근 제어';
  RAISE NOTICE '   - 포인트는 사용자가 직접 조작 불가 (시스템/관리자만)';
  RAISE NOTICE '   - 결제 정보는 사용자가 수정 불가 (조회만 가능)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 주의사항:';
  RAISE NOTICE '   - 기존 orders, shipments 테이블은 이전 마이그레이션 적용됨';
  RAISE NOTICE '   - 모든 정책은 role 기반으로 통일됨 (이메일 기반 제거)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

