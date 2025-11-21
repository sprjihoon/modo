-- ============================================
-- 프로모션 코드 RLS 정책 단순화 (디버깅용)
-- ============================================

-- 1. RLS 비활성화 후 재활성화 (정책 초기화)
ALTER TABLE public.promotion_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages DISABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Admins can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can view all promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view own promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Service role can create promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Authenticated users can create promotion code usages" ON public.promotion_code_usages;

-- 2. RLS 다시 활성화
ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

-- 3. 매우 간단한 정책: 인증된 모든 사용자에게 모든 권한
CREATE POLICY "allow_all_authenticated"
  ON public.promotion_codes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_usages"
  ON public.promotion_code_usages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. 테스트: 데이터 확인
SELECT 
  code,
  discount_type,
  discount_value,
  max_uses,
  used_count,
  description,
  is_active,
  valid_until
FROM public.promotion_codes
ORDER BY created_at DESC;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ RLS 정책이 단순화되었습니다!';
  RAISE NOTICE '📝 모든 인증된 사용자가 프로모션 코드를 관리할 수 있습니다.';
END $$;

