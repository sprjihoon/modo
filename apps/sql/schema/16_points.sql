-- ============================================
-- 모두의수선 - 포인트 관리 테이블
-- ============================================

-- 포인트 거래 유형 ENUM
CREATE TYPE point_transaction_type AS ENUM (
  'EARNED',     -- 적립
  'USED',       -- 사용
  'ADMIN_ADD',  -- 관리자 지급
  'ADMIN_SUB',  -- 관리자 차감
  'EXPIRED'     -- 만료
);

-- users 테이블에 포인트 잔액 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS point_balance INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_used_points INTEGER NOT NULL DEFAULT 0;

-- 포인트 잔액은 0 이상이어야 함
ALTER TABLE public.users 
ADD CONSTRAINT users_point_balance_check CHECK (point_balance >= 0);

-- 포인트 거래 내역 테이블
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 사용자 정보
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- 거래 정보
  type point_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- 설명 및 참조
  description TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- 만료 정보
  expires_at TIMESTAMPTZ,
  expired BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT point_transactions_amount_check CHECK (amount != 0)
);

-- RLS 활성화
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 포인트 거래 내역만 조회 가능
CREATE POLICY "Users can view own point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- 정책: 관리자는 모든 포인트 거래 내역 조회 가능
CREATE POLICY "Admins can view all point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 정책: 관리자는 포인트 거래 생성 가능
CREATE POLICY "Admins can insert point transactions"
  ON public.point_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 포인트 설정 테이블 (기간별 적립률)
CREATE TABLE IF NOT EXISTS public.point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 설정명
  name TEXT NOT NULL,
  description TEXT,
  
  -- 적립률 (%)
  earning_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  
  -- 기간 설정
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- 활성화 여부
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 우선순위 (높을수록 우선)
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- 제약조건
  CONSTRAINT point_settings_rate_check CHECK (earning_rate >= 0 AND earning_rate <= 100),
  CONSTRAINT point_settings_dates_check CHECK (end_date IS NULL OR end_date >= start_date)
);

-- RLS 활성화
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 활성화된 포인트 설정 조회 가능
CREATE POLICY "Users can view active point settings"
  ON public.point_settings
  FOR SELECT
  USING (is_active = TRUE);

-- 정책: 관리자는 모든 포인트 설정 조회/수정 가능
CREATE POLICY "Admins can manage point settings"
  ON public.point_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX idx_point_transactions_type ON public.point_transactions(type);
CREATE INDEX idx_point_transactions_order_id ON public.point_transactions(order_id);
CREATE INDEX idx_point_transactions_created_at ON public.point_transactions(created_at DESC);
CREATE INDEX idx_point_transactions_expires_at ON public.point_transactions(expires_at);
CREATE INDEX idx_point_transactions_expired ON public.point_transactions(expired);

CREATE INDEX idx_point_settings_is_active ON public.point_settings(is_active);
CREATE INDEX idx_point_settings_is_default ON public.point_settings(is_default);
CREATE INDEX idx_point_settings_dates ON public.point_settings(start_date, end_date);
CREATE INDEX idx_point_settings_priority ON public.point_settings(priority DESC);

-- 트리거: point_settings updated_at 자동 갱신
CREATE TRIGGER update_point_settings_updated_at
  BEFORE UPDATE ON public.point_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 기본 포인트 설정 데이터 삽입 (관리자가 변경 가능)
-- 초기 설정만 제공하고, 이후에는 관리자가 자유롭게 수정 가능
INSERT INTO public.point_settings (name, description, earning_rate, start_date, is_active, is_default, priority)
VALUES 
  ('기본 적립률', '기본 포인트 적립 정책 (언제든지 수정 가능)', 5.00, CURRENT_DATE, TRUE, TRUE, 0)
ON CONFLICT DO NOTHING;

-- 포인트 지급/차감 함수
CREATE OR REPLACE FUNCTION manage_user_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_type point_transaction_type,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_admin_user_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- 현재 포인트 잔액 조회
  SELECT point_balance INTO v_current_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- 새로운 잔액 계산
  IF p_type IN ('EARNED', 'ADMIN_ADD') THEN
    v_new_balance := v_current_balance + ABS(p_amount);
  ELSIF p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED') THEN
    v_new_balance := v_current_balance - ABS(p_amount);
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points. Current balance: %, Required: %', v_current_balance, ABS(p_amount);
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;
  
  -- 포인트 거래 내역 삽입
  INSERT INTO public.point_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    order_id,
    admin_user_id,
    expires_at
  ) VALUES (
    p_user_id,
    p_type,
    CASE 
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN ABS(p_amount)
      ELSE -ABS(p_amount)
    END,
    v_new_balance,
    p_description,
    p_order_id,
    p_admin_user_id,
    p_expires_at
  )
  RETURNING id INTO v_transaction_id;
  
  -- 사용자 포인트 잔액 업데이트
  UPDATE public.users
  SET 
    point_balance = v_new_balance,
    total_earned_points = CASE 
      WHEN p_type IN ('EARNED', 'ADMIN_ADD') THEN total_earned_points + ABS(p_amount)
      ELSE total_earned_points
    END,
    total_used_points = CASE 
      WHEN p_type IN ('USED', 'ADMIN_SUB', 'EXPIRED') THEN total_used_points + ABS(p_amount)
      ELSE total_used_points
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 현재 적용 가능한 포인트 설정 조회 함수
CREATE OR REPLACE FUNCTION get_current_point_setting()
RETURNS TABLE (
  id UUID,
  name TEXT,
  earning_rate DECIMAL(5,2),
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.name,
    ps.earning_rate,
    ps.start_date,
    ps.end_date
  FROM public.point_settings ps
  WHERE ps.is_active = TRUE
    AND ps.start_date <= CURRENT_DATE
    AND (ps.end_date IS NULL OR ps.end_date >= CURRENT_DATE)
  ORDER BY ps.priority DESC, ps.start_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 주문 완료 시 자동 포인트 적립 함수
CREATE OR REPLACE FUNCTION auto_earn_points_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_earning_rate DECIMAL(5,2);
  v_points_to_earn INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 상태가 DELIVERED로 변경되었을 때만 실행
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
    -- 현재 적립률 조회
    SELECT earning_rate INTO v_earning_rate
    FROM get_current_point_setting()
    LIMIT 1;
    
    -- 적립률이 없으면 기본값 0% 사용
    IF v_earning_rate IS NULL THEN
      v_earning_rate := 0;
    END IF;
    
    -- 적립 포인트 계산 (소수점 이하 버림)
    v_points_to_earn := FLOOR(NEW.total_price * v_earning_rate / 100);
    
    -- 포인트가 1원 이상일 때만 적립
    IF v_points_to_earn > 0 THEN
      -- 만료일: 1년 후
      v_expires_at := NOW() + INTERVAL '1 year';
      
      -- 포인트 적립
      PERFORM manage_user_points(
        NEW.user_id,
        v_points_to_earn,
        'EARNED'::point_transaction_type,
        FORMAT('주문 완료 적립 (%s%%)', v_earning_rate),
        NEW.id,
        NULL,
        v_expires_at
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주문 완료 시 자동 포인트 적립 트리거
CREATE TRIGGER trigger_auto_earn_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_earn_points_on_order_complete();

-- 주석
COMMENT ON TABLE public.point_transactions IS '포인트 거래 내역';
COMMENT ON TABLE public.point_settings IS '포인트 적립률 설정';
COMMENT ON COLUMN public.users.point_balance IS '현재 포인트 잔액';
COMMENT ON COLUMN public.users.total_earned_points IS '총 적립 포인트';
COMMENT ON COLUMN public.users.total_used_points IS '총 사용 포인트';
COMMENT ON FUNCTION manage_user_points IS '포인트 지급/차감 함수';
COMMENT ON FUNCTION get_current_point_setting IS '현재 적용 가능한 포인트 설정 조회';
COMMENT ON FUNCTION auto_earn_points_on_order_complete IS '주문 완료 시 자동 포인트 적립';

