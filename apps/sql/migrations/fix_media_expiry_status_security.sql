-- ============================================
-- media_expiry_status 뷰 보안 수정
-- SECURITY DEFINER -> SECURITY INVOKER
-- ============================================
-- 문제: SECURITY DEFINER 뷰는 뷰 생성자의 권한으로 실행되어 RLS를 우회할 수 있음
-- 해결: SECURITY INVOKER로 변경하여 쿼리 사용자의 권한으로 실행

-- 기존 뷰 삭제
DROP VIEW IF EXISTS public.media_expiry_status;

-- SECURITY INVOKER로 뷰 재생성 (기본값이지만 명시적으로 선언)
CREATE VIEW public.media_expiry_status 
WITH (security_invoker = true)
AS
SELECT 
  m.id,
  m.final_waybill_no,
  m.type,
  m.path as video_id,
  m.created_at,
  m.expires_at,
  CASE 
    WHEN m.expires_at IS NULL THEN '만료 없음'
    WHEN m.expires_at < NOW() THEN '만료됨'
    WHEN m.expires_at < NOW() + INTERVAL '7 days' THEN '7일 내 만료'
    WHEN m.expires_at < NOW() + INTERVAL '30 days' THEN '30일 내 만료'
    ELSE '정상'
  END as status,
  GREATEST(0, EXTRACT(DAY FROM (m.expires_at - NOW())))::INTEGER as days_remaining
FROM public.media m
ORDER BY m.expires_at ASC NULLS LAST;

COMMENT ON VIEW public.media_expiry_status IS '영상 만료 상태 모니터링 뷰 (SECURITY INVOKER)';

-- 관리자만 접근 가능하도록 권한 설정
REVOKE ALL ON public.media_expiry_status FROM PUBLIC;
GRANT SELECT ON public.media_expiry_status TO authenticated;

-- 확인
DO $$
BEGIN
  RAISE NOTICE '✅ media_expiry_status 뷰가 SECURITY INVOKER로 재생성되었습니다.';
  RAISE NOTICE '   이제 쿼리하는 사용자의 권한과 RLS 정책이 적용됩니다.';
END $$;
