-- ============================================
-- 프로모션 코드 RLS 정책 수정
-- 관리자 페이지에서 조회/관리할 수 있도록 수정
-- ============================================

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Admins can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view own promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Service role can create promotion code usages" ON public.promotion_code_usages;

-- 1. 일반 사용자는 활성화된 프로모션 코드만 조회 가능
CREATE POLICY "Users can view active promotion codes"
  ON public.promotion_codes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 2. 인증된 사용자는 모든 프로모션 코드 조회 가능 (개발 중)
-- 프로덕션에서는 관리자만 조회하도록 제한
CREATE POLICY "Authenticated users can view all promotion codes"
  ON public.promotion_codes
  FOR SELECT
  TO authenticated
  USING (true);  -- 개발 중에는 모든 인증 사용자가 조회 가능

-- 3. 인증된 사용자는 프로모션 코드 생성/수정/삭제 가능 (개발 중)
CREATE POLICY "Authenticated users can manage promotion codes"
  ON public.promotion_codes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. 사용자는 자신의 프로모션 코드 사용 이력 조회 가능
CREATE POLICY "Users can view own promotion code usages"
  ON public.promotion_code_usages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 5. 인증된 사용자는 프로모션 코드 사용 이력 생성 가능
CREATE POLICY "Authenticated users can create promotion code usages"
  ON public.promotion_code_usages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 확인: 현재 저장된 프로모션 코드 조회
SELECT 
  code,
  discount_type,
  discount_value,
  max_uses,
  used_count,
  description,
  is_active,
  TO_CHAR(valid_until, 'YYYY-MM-DD HH24:MI') as valid_until,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created_at
FROM public.promotion_codes
ORDER BY created_at DESC;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ 프로모션 코드 RLS 정책이 수정되었습니다!';
  RAISE NOTICE '📝 개발 중에는 모든 인증된 사용자가 프로모션 코드를 관리할 수 있습니다.';
  RAISE NOTICE '⚠️ 프로덕션 배포 시 정책을 제한하세요.';
END $$;

