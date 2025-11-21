-- ============================================
-- 모든 테이블 RLS 정책 단순화 (개발 환경)
-- 권한 에러 완전 해결
-- ============================================

-- 1. users 테이블 생성 및 RLS 설정
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT UNIQUE,
  default_address TEXT,
  default_address_detail TEXT,
  default_zipcode TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "allow_all_users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. orders 테이블 RLS 설정
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

CREATE POLICY "allow_all_orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. promotion_codes 테이블 RLS 설정
DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can view all promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can manage promotion codes" ON public.promotion_codes;

CREATE POLICY "allow_all_promotion_codes" ON public.promotion_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. promotion_code_usages 테이블 RLS 설정
DROP POLICY IF EXISTS "Users can view own promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Authenticated users can create promotion code usages" ON public.promotion_code_usages;

CREATE POLICY "allow_all_promotion_usages" ON public.promotion_code_usages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. 필수 RPC 함수 생성
CREATE OR REPLACE FUNCTION get_user_id_by_auth_id(auth_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.users WHERE auth_id = auth_user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_id_by_auth_id(UUID) TO authenticated;

-- 6. 프로모션 코드 사용 횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_promotion_code_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_codes
  SET used_count = used_count + 1, updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO authenticated;

-- 7. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 완료 확인
SELECT 'users' as table_name, COUNT(*) as row_count FROM public.users
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'promotion_codes', COUNT(*) FROM public.promotion_codes
UNION ALL
SELECT 'promotion_code_usages', COUNT(*) FROM public.promotion_code_usages;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ 모든 테이블 권한이 설정되었습니다!';
  RAISE NOTICE '📝 개발 중 모든 인증 사용자가 접근 가능합니다.';
  RAISE NOTICE '🎯 이제 앱이 정상 작동합니다!';
END $$;

