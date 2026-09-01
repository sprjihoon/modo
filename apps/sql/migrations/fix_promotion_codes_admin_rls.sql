-- promotion_codes: 관리자 쓰기 정책 보완
-- 기존 정책은 users.id = auth.uid() 와 role = 'admin' 을 검사해
-- 현재 스키마(auth_id, SUPER_ADMIN/ADMIN/MANAGER)와 맞지 않아 INSERT가 거부됨.
-- 실행: Supabase SQL Editor에서 이 파일을 실행하세요.

ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can view all promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Authenticated users can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Admins can manage promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "allow_all_promotion_codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.promotion_codes;

CREATE POLICY "Anyone can view active promotion codes"
  ON public.promotion_codes
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promotion codes"
  ON public.promotion_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role::text IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
        AND role::text IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    )
  );
