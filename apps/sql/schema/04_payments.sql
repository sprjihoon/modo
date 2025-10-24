-- ============================================
-- 모두의수선 - 결제 테이블
-- ============================================

-- 결제 수단 ENUM
CREATE TYPE payment_method AS ENUM (
  'CARD',           -- 신용/체크카드
  'BANK_TRANSFER',  -- 계좌이체
  'VIRTUAL_ACCOUNT', -- 가상계좌
  'MOBILE',         -- 휴대폰 결제
  'KAKAO_PAY',      -- 카카오페이
  'NAVER_PAY',      -- 네이버페이
  'TOSS_PAY'        -- 토스페이
);

-- 결제 테이블
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 주문 연결
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- PortOne (아임포트) 정보
  imp_uid TEXT NOT NULL UNIQUE,
  merchant_uid TEXT NOT NULL UNIQUE,
  
  -- 결제 정보
  amount INTEGER NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'CARD',
  payment_method_detail TEXT,
  
  -- 상태
  status payment_status NOT NULL DEFAULT 'PENDING',
  
  -- 결제 상세
  card_name TEXT,
  card_number TEXT,
  bank_name TEXT,
  
  -- 결제자 정보
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  
  -- 타임스탬프
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- 실패/환불 사유
  fail_reason TEXT,
  refund_reason TEXT,
  refund_amount INTEGER DEFAULT 0,
  
  -- 영수증
  receipt_url TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT payments_amount_check CHECK (amount > 0),
  CONSTRAINT payments_refund_amount_check CHECK (refund_amount >= 0 AND refund_amount <= amount)
);

-- RLS 활성화
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 결제만 조회 가능
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()
      )
    )
  );

-- 정책: 관리자는 모든 결제 조회 가능
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_imp_uid ON public.payments(imp_uid);
CREATE INDEX idx_payments_merchant_uid ON public.payments(merchant_uid);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_paid_at ON public.payments(paid_at DESC);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.payments IS '결제 정보 (PortOne 연동)';
COMMENT ON COLUMN public.payments.imp_uid IS 'PortOne 결제 고유번호';
COMMENT ON COLUMN public.payments.merchant_uid IS '가맹점 주문번호';

