-- ============================================
-- Action Logging System 마이그레이션
-- KPI 분석 및 감사(Audit) 추적 용도
-- ============================================

-- 1. ActionType ENUM 생성
DO $$ BEGIN
  CREATE TYPE action_type AS ENUM (
    -- COMMON
    'LOGIN',
    'LOGOUT',
    
    -- WORKER
    'SCAN_INBOUND',
    'WORK_START',
    'WORK_COMPLETE',
    'REQ_EXTRA_CHARGE',
    
    -- MANAGER
    'APPROVE_EXTRA',
    'REJECT_EXTRA',
    'SCAN_OUTBOUND',
    'RETURN_PROCESS',
    
    -- ADMIN
    'UPDATE_USER',
    'DELETE_USER'
  );
  RAISE NOTICE '✅ action_type ENUM 생성 완료';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE '⏭️  action_type ENUM이 이미 존재합니다';
END $$;

-- 2. action_logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.action_logs (
  -- 기본 정보
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 행위자 정보
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,  -- 검색 편의성
  actor_role TEXT NOT NULL,  -- user_role ENUM 값을 TEXT로 저장
  
  -- 액션 정보
  action_type action_type NOT NULL,
  
  -- 대상 정보
  target_id TEXT,  -- 주문 ID (Invoice No) 또는 기타 대상 ID
  
  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,  -- 추가 정보 (예: "상태 변경: A → B", "추가금 5000원")
  
  -- 타임스탬프
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 인덱스
  CONSTRAINT action_logs_check_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- 3. 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_action_logs_actor_id ON public.action_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action_type ON public.action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_action_logs_target_id ON public.action_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON public.action_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_actor_role ON public.action_logs(actor_role);

-- 복합 인덱스: 특정 사용자의 액션 조회
CREATE INDEX IF NOT EXISTS idx_action_logs_actor_timestamp 
  ON public.action_logs(actor_id, timestamp DESC);

-- 복합 인덱스: 특정 주문의 액션 이력 조회
CREATE INDEX IF NOT EXISTS idx_action_logs_target_timestamp 
  ON public.action_logs(target_id, timestamp DESC);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성
-- ADMIN: 모든 로그 조회 가능
CREATE POLICY "Admins can view all logs"
  ON public.action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- MANAGER: 모든 로그 조회 가능
CREATE POLICY "Managers can view all logs"
  ON public.action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND role = 'MANAGER'
    )
  );

-- WORKER: 자신의 로그만 조회 가능
CREATE POLICY "Workers can view own logs"
  ON public.action_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND id = action_logs.actor_id
    )
  );

-- INSERT 정책: 모든 인증된 사용자가 로그 생성 가능 (자신의 것만)
CREATE POLICY "Users can insert own logs"
  ON public.action_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND id = action_logs.actor_id
    )
  );

-- 6. 주석 추가
COMMENT ON TABLE public.action_logs IS '사용자 액션 로그 - KPI 분석 및 감사 추적용';
COMMENT ON COLUMN public.action_logs.actor_id IS '행위자 User ID (users 테이블 FK)';
COMMENT ON COLUMN public.action_logs.actor_name IS '행위자 이름 (검색 편의성)';
COMMENT ON COLUMN public.action_logs.actor_role IS '행위자 역할 (ADMIN, MANAGER, WORKER)';
COMMENT ON COLUMN public.action_logs.action_type IS '액션 타입 (LOGIN, WORK_START, APPROVE_EXTRA 등)';
COMMENT ON COLUMN public.action_logs.target_id IS '대상 주문 ID (Invoice No) 또는 대상 사용자 ID';
COMMENT ON COLUMN public.action_logs.metadata IS '추가 정보 (상태 변경, 추가금액 등)';
COMMENT ON COLUMN public.action_logs.timestamp IS '액션 발생 시각 (서버 시간)';

-- 7. 마이그레이션 완료 로그
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Action Logging System 마이그레이션 완료';
  RAISE NOTICE '   ✅ action_type ENUM 생성 (13개 타입)';
  RAISE NOTICE '   ✅ action_logs 테이블 생성';
  RAISE NOTICE '   ✅ 인덱스 생성 (7개)';
  RAISE NOTICE '   ✅ RLS 정책 설정 (역할별 접근 제어)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 사용 가능한 ActionType:';
  RAISE NOTICE '   - COMMON: LOGIN, LOGOUT';
  RAISE NOTICE '   - WORKER: SCAN_INBOUND, WORK_START, WORK_COMPLETE, REQ_EXTRA_CHARGE';
  RAISE NOTICE '   - MANAGER: APPROVE_EXTRA, REJECT_EXTRA, SCAN_OUTBOUND, RETURN_PROCESS';
  RAISE NOTICE '   - ADMIN: UPDATE_USER, DELETE_USER';
  RAISE NOTICE '';
END $$;

