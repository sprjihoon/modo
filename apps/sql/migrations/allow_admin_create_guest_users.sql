-- ============================================
-- 관리자가 게스트 사용자를 생성할 수 있도록 허용
-- ============================================

-- 기존 INSERT 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Admins can insert guest users" ON public.users;

-- 관리자는 게스트 사용자(auth_id가 null인 사용자)를 생성할 수 있음
CREATE POLICY "Admins can insert guest users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    -- 일반 사용자: 자신의 프로필만 생성 가능
    (auth.uid() = auth_id)
    OR
    -- 관리자: 게스트 사용자 생성 가능
    (
      auth_id IS NULL
      AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND email LIKE '%@admin.modusrepair.com'
      )
    )
  );

-- 포인트 관련 컬럼이 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'point_balance'
  ) THEN
    ALTER TABLE public.users ADD COLUMN point_balance INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'total_earned_points'
  ) THEN
    ALTER TABLE public.users ADD COLUMN total_earned_points INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'total_used_points'
  ) THEN
    ALTER TABLE public.users ADD COLUMN total_used_points INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 주석 추가
COMMENT ON POLICY "Admins can insert guest users" ON public.users IS 
  '사용자는 자신의 프로필을 생성할 수 있고, 관리자는 게스트 사용자를 생성할 수 있음';

COMMENT ON COLUMN public.users.point_balance IS '현재 포인트 잔액';
COMMENT ON COLUMN public.users.total_earned_points IS '누적 획득 포인트';
COMMENT ON COLUMN public.users.total_used_points IS '누적 사용 포인트';

