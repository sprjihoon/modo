-- 추가 결제 테이블
-- 검수 후 추가 비용이 발생했을 때 사용

CREATE TABLE IF NOT EXISTS additional_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- 결제 정보
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL, -- 추가 비용 사유 (예: "단추 교체 추가", "원단 손상 수선")
  description TEXT, -- 상세 설명
  
  -- 토스페이먼츠 정보
  payment_key TEXT, -- 결제 완료 시 토스에서 받은 키
  order_id_toss TEXT NOT NULL UNIQUE, -- 토스로 보낼 주문번호 (원본_orderId-EXTRA-timestamp)
  
  -- 상태
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED', 'CANCELLED')),
  -- PENDING: 결제 대기
  -- PAID: 결제 완료
  -- REJECTED: 고객 거부
  -- CANCELLED: 취소됨
  
  -- 결제 완료 정보
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 결제수단 (CARD, VIRTUAL_ACCOUNT 등)
  
  -- 요청자 정보
  requested_by UUID REFERENCES auth.users(id), -- 관리자 ID
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 고객 응답
  customer_response_at TIMESTAMPTZ, -- 고객이 수락/거부한 시간
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_additional_payments_order_id ON additional_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_additional_payments_status ON additional_payments(status);
CREATE INDEX IF NOT EXISTS idx_additional_payments_payment_key ON additional_payments(payment_key);

-- RLS 정책
ALTER TABLE additional_payments ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 추가 결제 조회 가능
CREATE POLICY "관리자는 모든 추가 결제 조회 가능"
  ON additional_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 사용자는 자신의 주문에 대한 추가 결제만 조회 가능
CREATE POLICY "사용자는 자신의 주문 추가 결제 조회 가능"
  ON additional_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = additional_payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- 관리자만 추가 결제 요청 생성 가능
CREATE POLICY "관리자만 추가 결제 요청 생성"
  ON additional_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- 관리자와 본인만 추가 결제 업데이트 가능
CREATE POLICY "관리자와 본인만 추가 결제 업데이트"
  ON additional_payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = additional_payments.order_id
          AND orders.user_id = auth.uid()
        )
      )
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_additional_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_additional_payments_updated_at
  BEFORE UPDATE ON additional_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_additional_payments_updated_at();

-- 코멘트
COMMENT ON TABLE additional_payments IS '추가 결제 요청 및 이력';
COMMENT ON COLUMN additional_payments.amount IS '추가 결제 금액';
COMMENT ON COLUMN additional_payments.reason IS '추가 비용 사유';
COMMENT ON COLUMN additional_payments.status IS 'PENDING: 대기, PAID: 완료, REJECTED: 거부, CANCELLED: 취소';
COMMENT ON COLUMN additional_payments.order_id_toss IS '토스페이먼츠에 전달할 고유 주문번호';

