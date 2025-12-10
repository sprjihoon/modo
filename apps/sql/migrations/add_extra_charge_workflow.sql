-- ============================================
-- 추가 과금(Extra Charge) 워크플로우 구현
-- ============================================
-- 작성일: 2025-12-10
-- 설명: 작업자 요청 -> 관리자 승인 -> 고객 결제 워크플로우

-- 1. ExtraChargeStatus ENUM 생성
DO $$ BEGIN
  CREATE TYPE extra_charge_status AS ENUM (
    'NONE',                -- 초기 상태 (기본값)
    'PENDING_MANAGER',     -- 작업자가 요청함 (관리자 확인 대기)
    'PENDING_CUSTOMER',    -- 관리자 승인 또는 직접 요청 (고객 결제 대기)
    'COMPLETED',           -- 고객이 추가금 결제 완료 (작업 재개)
    'SKIPPED',             -- 고객이 거절하고 원안대로 진행
    'RETURN_REQUESTED'     -- 고객이 반송 요청 (작업 중단)
  );
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'ENUM extra_charge_status 이미 존재함';
END $$;

-- 2. orders 테이블에 추가 과금 관련 컬럼 추가
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS extra_charge_status extra_charge_status NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS extra_charge_data JSONB DEFAULT '{}'::jsonb;

-- extra_charge_data 구조:
-- {
--   "workerMemo": "현장 상황 메모 (작업자 또는 관리자가 작성)",
--   "managerPrice": 추가 청구 금액 (정수),
--   "managerNote": "고객에게 보여질 안내 멘트",
--   "requestedAt": "요청 시각 (ISO 8601)",
--   "approvedAt": "승인 시각 (ISO 8601)",
--   "completedAt": "완료 시각 (ISO 8601)",
--   "requestedBy": "요청자 ID (UUID)",
--   "approvedBy": "승인자 ID (UUID)"
-- }

COMMENT ON COLUMN public.orders.extra_charge_status IS '추가 과금 워크플로우 상태';
COMMENT ON COLUMN public.orders.extra_charge_data IS '추가 과금 상세 데이터 (JSON)';

-- 3. 인덱스 추가 (빠른 조회를 위함)
CREATE INDEX IF NOT EXISTS idx_orders_extra_charge_status 
  ON public.orders(extra_charge_status);

-- 4. order_status에 HOLD 추가 (작업 일시정지 상태)
-- 기존 ENUM에 새 값을 추가하려면 ALTER TYPE 사용
DO $$ 
BEGIN
  -- HOLD 상태가 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'HOLD' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'HOLD' AFTER 'PROCESSING';
    RAISE NOTICE '✅ order_status에 HOLD 추가 완료';
  ELSE
    RAISE NOTICE '⚠️ HOLD는 이미 존재함';
  END IF;
END $$;

-- 5. order_status에 RETURN_PENDING 추가 (반송 대기 상태)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'RETURN_PENDING' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'RETURN_PENDING' AFTER 'HOLD';
    RAISE NOTICE '✅ order_status에 RETURN_PENDING 추가 완료';
  ELSE
    RAISE NOTICE '⚠️ RETURN_PENDING은 이미 존재함';
  END IF;
END $$;

-- 6. 헬퍼 함수: 추가 과금 요청 (작업자/관리자 공통)
CREATE OR REPLACE FUNCTION request_extra_charge(
  p_order_id UUID,
  p_user_id UUID,
  p_memo TEXT,
  p_price INTEGER DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_role TEXT;
  v_order_status TEXT;
  v_result JSONB;
  v_extra_data JSONB;
BEGIN
  -- 1. 사용자 role 확인
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다';
  END IF;

  -- 2. 주문 상태 확인
  SELECT status INTO v_order_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order_status IS NULL THEN
    RAISE EXCEPTION '주문을 찾을 수 없습니다';
  END IF;

  -- 3. 작업자(WORKER)인 경우
  IF v_user_role = 'WORKER' THEN
    v_extra_data := jsonb_build_object(
      'workerMemo', p_memo,
      'requestedAt', NOW(),
      'requestedBy', p_user_id
    );

    UPDATE public.orders
    SET 
      extra_charge_status = 'PENDING_MANAGER',
      extra_charge_data = v_extra_data,
      status = 'HOLD',
      updated_at = NOW()
    WHERE id = p_order_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', '관리자 승인 대기 중',
      'status', 'PENDING_MANAGER'
    );

  -- 4. 관리자(MANAGER/ADMIN)인 경우 (Direct Pass)
  ELSIF v_user_role IN ('MANAGER', 'ADMIN') THEN
    IF p_price IS NULL THEN
      RAISE EXCEPTION '관리자는 금액을 입력해야 합니다';
    END IF;

    v_extra_data := jsonb_build_object(
      'workerMemo', p_memo,
      'managerPrice', p_price,
      'managerNote', COALESCE(p_note, ''),
      'requestedAt', NOW(),
      'requestedBy', p_user_id,
      'approvedAt', NOW(),
      'approvedBy', p_user_id
    );

    UPDATE public.orders
    SET 
      extra_charge_status = 'PENDING_CUSTOMER',
      extra_charge_data = v_extra_data,
      status = 'HOLD',
      updated_at = NOW()
    WHERE id = p_order_id;

    v_result := jsonb_build_object(
      'success', true,
      'message', '고객 결제 대기 중 (Direct Pass)',
      'status', 'PENDING_CUSTOMER'
    );

  ELSE
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 헬퍼 함수: 관리자 승인
CREATE OR REPLACE FUNCTION approve_extra_charge(
  p_order_id UUID,
  p_manager_id UUID,
  p_price INTEGER,
  p_note TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_role TEXT;
  v_current_status extra_charge_status;
  v_extra_data JSONB;
BEGIN
  -- 1. 관리자 권한 확인
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_manager_id;

  IF v_user_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- 2. 현재 상태 확인
  SELECT extra_charge_status, extra_charge_data INTO v_current_status, v_extra_data
  FROM public.orders
  WHERE id = p_order_id;

  IF v_current_status != 'PENDING_MANAGER' THEN
    RAISE EXCEPTION '승인 대기 상태가 아닙니다 (현재: %)', v_current_status;
  END IF;

  -- 3. 데이터 업데이트
  v_extra_data := v_extra_data || jsonb_build_object(
    'managerPrice', p_price,
    'managerNote', p_note,
    'approvedAt', NOW(),
    'approvedBy', p_manager_id
  );

  UPDATE public.orders
  SET 
    extra_charge_status = 'PENDING_CUSTOMER',
    extra_charge_data = v_extra_data,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', '승인 완료. 고객 결제 대기 중',
    'status', 'PENDING_CUSTOMER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 헬퍼 함수: 고객 결정 처리
CREATE OR REPLACE FUNCTION process_customer_decision(
  p_order_id UUID,
  p_action TEXT, -- 'PAY', 'SKIP', 'RETURN'
  p_customer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_status extra_charge_status;
  v_order_user_id UUID;
  v_extra_data JSONB;
  v_new_order_status TEXT;
BEGIN
  -- 1. 주문 소유자 확인
  SELECT user_id, extra_charge_status, extra_charge_data 
  INTO v_order_user_id, v_current_status, v_extra_data
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order_user_id != p_customer_id THEN
    RAISE EXCEPTION '본인의 주문만 처리할 수 있습니다';
  END IF;

  IF v_current_status != 'PENDING_CUSTOMER' THEN
    RAISE EXCEPTION '고객 결제 대기 상태가 아닙니다 (현재: %)', v_current_status;
  END IF;

  -- 2. 액션에 따른 처리
  IF p_action = 'PAY' THEN
    -- 추가 결제 완료
    v_extra_data := v_extra_data || jsonb_build_object(
      'completedAt', NOW(),
      'customerAction', 'PAY'
    );

    UPDATE public.orders
    SET 
      extra_charge_status = 'COMPLETED',
      extra_charge_data = v_extra_data,
      status = 'PROCESSING',
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', '추가 결제 완료. 작업 재개',
      'status', 'COMPLETED'
    );

  ELSIF p_action = 'SKIP' THEN
    -- 추가 작업 거절, 원안대로 진행
    v_extra_data := v_extra_data || jsonb_build_object(
      'completedAt', NOW(),
      'customerAction', 'SKIP'
    );

    UPDATE public.orders
    SET 
      extra_charge_status = 'SKIPPED',
      extra_charge_data = v_extra_data,
      status = 'PROCESSING',
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', '원안대로 진행합니다',
      'status', 'SKIPPED'
    );

  ELSIF p_action = 'RETURN' THEN
    -- 반송 요청
    v_extra_data := v_extra_data || jsonb_build_object(
      'completedAt', NOW(),
      'customerAction', 'RETURN',
      'returnFee', 6000
    );

    UPDATE public.orders
    SET 
      extra_charge_status = 'RETURN_REQUESTED',
      extra_charge_data = v_extra_data,
      status = 'RETURN_PENDING',
      updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', '반송 요청 완료. 왕복 배송비 6,000원 차감됩니다',
      'status', 'RETURN_REQUESTED'
    );

  ELSE
    RAISE EXCEPTION '잘못된 액션입니다: %', p_action;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS 정책 업데이트 (함수 사용 권한)
-- 작업자/관리자는 추가 과금 요청 가능
GRANT EXECUTE ON FUNCTION request_extra_charge TO authenticated;
GRANT EXECUTE ON FUNCTION approve_extra_charge TO authenticated;
GRANT EXECUTE ON FUNCTION process_customer_decision TO authenticated;

-- 10. 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ 추가 과금(Extra Charge) 워크플로우 마이그레이션 완료';
  RAISE NOTICE '   - extra_charge_status ENUM 생성';
  RAISE NOTICE '   - orders 테이블에 컬럼 추가';
  RAISE NOTICE '   - order_status에 HOLD, RETURN_PENDING 추가';
  RAISE NOTICE '   - 헬퍼 함수 3개 생성';
END $$;

