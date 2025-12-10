-- ============================================
-- 고객용 앱 role 설정 수정 (CRITICAL FIX)
-- ============================================
-- 목적: 기존 add_user_role.sql이 관리자용이므로, 고객용 role 추가 및 기존 사용자 마이그레이션
-- 작성일: 2025-12-10
-- 우선순위: 🚨 CRITICAL - 이 마이그레이션을 먼저 실행해야 합니다!
-- ============================================

-- 1. user_role ENUM에 CUSTOMER 추가
DO $$ BEGIN
  -- CUSTOMER role이 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'CUSTOMER'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'CUSTOMER';
    RAISE NOTICE '✅ CUSTOMER role 추가됨';
  ELSE
    RAISE NOTICE '⏭️ CUSTOMER role이 이미 존재합니다';
  END IF;
END $$;

-- 2. users 테이블의 role 기본값을 CUSTOMER로 변경
ALTER TABLE public.users 
ALTER COLUMN role SET DEFAULT 'CUSTOMER';

COMMENT ON COLUMN public.users.role IS '사용자 역할: CUSTOMER(고객), ADMIN(관리자), MANAGER(매니저), WORKER(작업자). 기본값: CUSTOMER';

-- 3. 기존 사용자들을 CUSTOMER로 업데이트
-- (관리자 이메일 도메인이 아니고, role이 WORKER이거나 NULL인 경우)
UPDATE public.users
SET role = 'CUSTOMER'
WHERE (role = 'WORKER' OR role IS NULL)
  AND email NOT LIKE '%@admin.modusrepair.com'
  AND email NOT LIKE '%@manager.modusrepair.com';

-- 업데이트된 레코드 수 출력
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.users
  WHERE role = 'CUSTOMER';
  
  RAISE NOTICE '✅ CUSTOMER role로 업데이트된 사용자 수: %', updated_count;
END $$;

-- 4. RLS 정책 업데이트: 고객(CUSTOMER) 포함
-- 기존 정책들은 ADMIN만 체크했으므로, CUSTOMER도 자신의 데이터에 접근 가능하도록 보장

-- users 테이블: 고객도 자신의 프로필 조회 가능 (이미 auth_id 기반이므로 OK)
-- addresses 테이블: 고객도 자신의 배송지 관리 가능 (이미 user_id 기반이므로 OK)
-- orders 테이블: 고객도 자신의 주문 조회 가능 (이미 user_id 기반이므로 OK)
-- payments 테이블: 고객도 자신의 결제 정보 조회 가능 (이미 order_id → user_id 기반이므로 OK)
-- point_transactions 테이블: 고객도 자신의 포인트 내역 조회 가능 (이미 user_id 기반이므로 OK)

-- 5. 회원가입 트리거: 자동으로 users 테이블에 CUSTOMER role로 생성
-- (이미 auth_service.dart에서 처리하지만, 안전장치로 트리거 추가)
CREATE OR REPLACE FUNCTION auto_create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- auth.users에 새 사용자가 생성되면 자동으로 public.users에 프로필 생성
  INSERT INTO public.users (auth_id, email, name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', '사용자'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'CUSTOMER'  -- 기본값: CUSTOMER
  )
  ON CONFLICT (auth_id) DO NOTHING;  -- 이미 존재하면 무시
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (이미 존재하면 교체)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_profile();

COMMENT ON FUNCTION auto_create_user_profile IS '회원가입 시 자동으로 public.users에 CUSTOMER 프로필 생성';

-- 6. 관리자/매니저 계정 식별 및 role 할당
-- (관리자 이메일 도메인을 가진 사용자는 자동으로 ADMIN role 부여)
UPDATE public.users
SET role = 'ADMIN'
WHERE email LIKE '%@admin.modusrepair.com'
  AND role != 'ADMIN';

UPDATE public.users
SET role = 'MANAGER'
WHERE email LIKE '%@manager.modusrepair.com'
  AND role != 'MANAGER'
  AND role != 'ADMIN';

-- 7. role NULL 체크 제약조건 추가 (향후 NULL 방지)
-- 이미 NOT NULL이 설정되어 있으므로 추가 제약조건 불필요

-- 8. 마이그레이션 완료 로그
DO $$
DECLARE
  customer_count INTEGER;
  admin_count INTEGER;
  manager_count INTEGER;
  worker_count INTEGER;
BEGIN
  -- 각 role별 사용자 수 집계
  SELECT COUNT(*) INTO customer_count FROM public.users WHERE role = 'CUSTOMER';
  SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'ADMIN';
  SELECT COUNT(*) INTO manager_count FROM public.users WHERE role = 'MANAGER';
  SELECT COUNT(*) INTO worker_count FROM public.users WHERE role = 'WORKER';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ 고객용 앱 role 설정 수정 완료';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 사용자 role 분포:';
  RAISE NOTICE '   - CUSTOMER (고객): % 명', customer_count;
  RAISE NOTICE '   - ADMIN (관리자): % 명', admin_count;
  RAISE NOTICE '   - MANAGER (매니저): % 명', manager_count;
  RAISE NOTICE '   - WORKER (작업자): % 명', worker_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 보안 설정:';
  RAISE NOTICE '   - 기본 role: CUSTOMER (고객)';
  RAISE NOTICE '   - 회원가입 시 자동으로 CUSTOMER role 부여';
  RAISE NOTICE '   - 관리자 이메일 (@admin.modusrepair.com): ADMIN';
  RAISE NOTICE '   - 매니저 이메일 (@manager.modusrepair.com): MANAGER';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 중요: 이 마이그레이션을 add_comprehensive_rls_privacy_all_tables.sql보다 먼저 실행하세요!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

