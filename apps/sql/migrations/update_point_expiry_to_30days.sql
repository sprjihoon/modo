-- ============================================
-- 포인트 시스템 개선: 30일 만료 및 FIFO 자동 소멸
-- ============================================

-- 1. 포인트 적립 시 만료일을 30일로 변경
CREATE OR REPLACE FUNCTION auto_earn_points_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_earning_rate DECIMAL(5,2);
  v_points_to_earn INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_existing_earn_id UUID;
  v_existing_earn_amount INTEGER;
  v_current_user_balance INTEGER;
  v_refund_amount INTEGER;
BEGIN
  -- 1. DELIVERED 상태로 변경 시 (적립)
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
    
    -- 이미 적립된 내역이 있는지 확인
    SELECT id INTO v_existing_earn_id
    FROM public.point_transactions
    WHERE order_id = NEW.id AND type = 'EARNED'
    LIMIT 1;

    -- 이미 적립된 내역이 있다면 스킵 (중복 적립 방지)
    IF v_existing_earn_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- 현재 적립률 조회
    SELECT earning_rate INTO v_earning_rate
    FROM get_current_point_setting()
    LIMIT 1;
    
    IF v_earning_rate IS NULL THEN
      v_earning_rate := 0;
    END IF;
    
    -- 적립 포인트 계산
    v_points_to_earn := FLOOR(NEW.total_price * v_earning_rate / 100);
    
    IF v_points_to_earn > 0 THEN
      -- 만료일: 30일 후 (변경)
      v_expires_at := NOW() + INTERVAL '30 days';
      
      -- 포인트 적립 실행
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

  -- 2. CANCELLED 또는 REFUNDED 상태로 변경 시 (적립 취소)
  ELSIF NEW.status IN ('CANCELLED', 'REFUNDED') AND OLD.status = 'DELIVERED' THEN
    
    -- 이 주문으로 적립된 포인트가 있는지 확인
    SELECT amount INTO v_existing_earn_amount
    FROM public.point_transactions
    WHERE order_id = NEW.id AND type = 'EARNED'
    LIMIT 1;
    
    -- 적립된 포인트가 있다면 회수 시도
    IF v_existing_earn_amount IS NOT NULL AND v_existing_earn_amount > 0 THEN
      
      -- 사용자의 현재 잔액 확인
      SELECT point_balance INTO v_current_user_balance
      FROM public.users
      WHERE id = NEW.user_id;
      
      -- 회수 가능한 금액 계산 (잔액보다 많이 회수할 수 없음)
      v_refund_amount := LEAST(v_existing_earn_amount, v_current_user_balance);
      
      IF v_refund_amount > 0 THEN
        PERFORM manage_user_points(
          NEW.user_id,
          v_refund_amount,
          'EARN_CANCEL'::point_transaction_type,
          '주문 취소/환불로 인한 적립 취소',
          NEW.id,
          NULL,
          NULL
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. FIFO 방식으로 만료된 포인트 자동 소멸 함수
CREATE OR REPLACE FUNCTION expire_points_fifo()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_transaction RECORD;
  v_points_to_expire INTEGER;
  v_user_balance INTEGER;
BEGIN
  -- 만료된 포인트 거래를 찾아서 FIFO 순서로 처리
  -- (expires_at이 지났고, 아직 expired 플래그가 FALSE인 EARNED 타입만)
  FOR v_transaction IN
    SELECT 
      pt.id,
      pt.user_id,
      pt.amount,
      pt.expires_at,
      u.point_balance,
      u.email
    FROM public.point_transactions pt
    INNER JOIN public.users u ON pt.user_id = u.id
    WHERE pt.type = 'EARNED'
      AND pt.expired = FALSE
      AND pt.expires_at IS NOT NULL
      AND pt.expires_at <= NOW()
      AND pt.amount > 0  -- 양수인 적립만 (이미 사용된 것은 제외)
    ORDER BY pt.expires_at ASC, pt.created_at ASC  -- 오래된 것부터 (FIFO)
    FOR UPDATE OF pt, u
  LOOP
    -- 사용자의 현재 잔액 확인
    v_user_balance := v_transaction.point_balance;
    
    -- 소멸할 포인트 금액 (잔액보다 많을 수 없음)
    v_points_to_expire := LEAST(v_transaction.amount, v_user_balance);
    
    -- 잔액이 있고 소멸할 포인트가 있으면 처리
    IF v_user_balance > 0 AND v_points_to_expire > 0 THEN
      -- 포인트 소멸 처리
      PERFORM manage_user_points(
        v_transaction.user_id,
        v_points_to_expire,
        'EXPIRED'::point_transaction_type,
        FORMAT('포인트 만료 (적립일: %s)', TO_CHAR(v_transaction.expires_at - INTERVAL '30 days', 'YYYY-MM-DD')),
        NULL,
        NULL,
        NULL
      );
      
      -- 해당 거래를 만료 처리로 표시
      UPDATE public.point_transactions
      SET expired = TRUE
      WHERE id = v_transaction.id;
      
      v_expired_count := v_expired_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- 3. 수동 실행용 함수 (관리자가 필요시 호출 가능)
CREATE OR REPLACE FUNCTION expire_points_manual()
RETURNS TABLE(
  expired_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  v_count := expire_points_fifo();
  
  RETURN QUERY SELECT 
    v_count,
    FORMAT('총 %s건의 만료된 포인트가 소멸되었습니다.', v_count)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 주석 업데이트
COMMENT ON FUNCTION auto_earn_points_on_order_complete IS '주문 완료 시 자동 포인트 적립 (30일 만료, 중복 방지 및 환불 처리 포함)';
COMMENT ON FUNCTION expire_points_fifo IS 'FIFO 방식으로 만료된 포인트를 자동 소멸하는 함수';
COMMENT ON FUNCTION expire_points_manual IS '수동으로 만료된 포인트를 소멸하는 함수 (관리자용)';

