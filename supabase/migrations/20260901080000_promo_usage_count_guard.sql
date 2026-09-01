-- 사용 횟수는 한도를 넘기지 않고, 증가 RPC는 서버만 호출한다.

CREATE OR REPLACE FUNCTION public.increment_promotion_code_usage(promo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promotion_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = promo_id
    AND (max_uses IS NULL OR used_count < max_uses);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_promotion_code_usage(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_promotion_code_usage(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.increment_promotion_code_usage(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promotion_code_usage(UUID) TO service_role;

ALTER TABLE public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own promotion code usages" ON public.promotion_code_usages;
CREATE POLICY "Users can view own promotion code usages"
  ON public.promotion_code_usages FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id = public.current_public_user_id()
  );

DROP POLICY IF EXISTS "Service role can create promotion code usages" ON public.promotion_code_usages;
DROP POLICY IF EXISTS "Users can insert own promotion code usages" ON public.promotion_code_usages;
-- INSERT는 service_role만 (RLS bypass). 클라이언트 직접 insert로 횟수를 부풀리지 못하게 한다.
