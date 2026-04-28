-- =====================================================
-- customer_events RLS 정책 설정
-- 웹/앱 모두 이벤트를 기록할 수 있도록 설정
-- =====================================================

-- RLS 활성화 (이미 활성화되어 있어도 safe)
ALTER TABLE public.customer_events ENABLE ROW LEVEL SECURITY;

-- 기존 정책 초기화 (있을 경우)
DROP POLICY IF EXISTS "Users can insert own events" ON public.customer_events;
DROP POLICY IF EXISTS "Admins can read all events" ON public.customer_events;
DROP POLICY IF EXISTS "Users can read own events" ON public.customer_events;
DROP POLICY IF EXISTS "Service role full access" ON public.customer_events;
DROP POLICY IF EXISTS "Anon can insert events" ON public.customer_events;
DROP POLICY IF EXISTS "Allow event insert for authenticated" ON public.customer_events;

-- 1. 인증 사용자: 자신의 이벤트 삽입 허용 (user_id = NULL 또는 자신의 public.users.id)
CREATE POLICY "Allow event insert for authenticated"
  ON public.customer_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 2. 비인증(anon) 사용자: user_id = NULL 인 경우만 허용 (비로그인 웹 방문자)
CREATE POLICY "Allow anon event insert"
  ON public.customer_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- 3. 인증 사용자: 자신의 이벤트 조회
CREATE POLICY "Users can read own events"
  ON public.customer_events
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 4. ADMIN/MANAGER 역할: 전체 이벤트 조회
CREATE POLICY "Admins can read all events"
  ON public.customer_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'MANAGER', 'WORKER')
    )
  );
