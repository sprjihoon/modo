-- popups RLS: auth.users 참조 정책이 anon SELECT를 깨뜨림
-- 관리자 쓰기는 service role(API)로 하므로 RLS admin 정책 제거

DROP POLICY IF EXISTS "Admins can view all popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can insert popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can update popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can delete popups" ON public.popups;

-- 고객(anon/authenticated): 활성 + 기간 내 팝업만 조회
DROP POLICY IF EXISTS "Anyone can view active scheduled popups" ON public.popups;
CREATE POLICY "Anyone can view active scheduled popups"
  ON public.popups
  FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );
