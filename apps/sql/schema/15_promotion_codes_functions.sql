-- ============================================
-- 프로모션 코드 관련 함수
-- ============================================

-- 프로모션 코드 사용 횟수 증가 함수
CREATE OR REPLACE FUNCTION increment_promotion_code_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 권한 설정
GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_promotion_code_usage(UUID) TO service_role;

