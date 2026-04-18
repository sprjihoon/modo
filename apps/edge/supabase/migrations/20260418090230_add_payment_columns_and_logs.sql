-- 012_add_payment_columns_and_logs.sql
-- 결제 후처리 / 환불 추적용 누락 컬럼 + 로그 테이블 추가
-- 발견 배경:
--   apps/edge/.../payments-confirm-toss, apps/admin/app/api/pay/{confirm,cancel,webhook}
--   가 orders.payment_key / paid_at / canceled_at 와 payment_logs / webhook_logs 를
--   업데이트/삽입하려 하지만 production DB에는 해당 컬럼/테이블이 없어서
--   매 결제 승인/환불 후처리가 PostgREST 400으로 실패하고 있었음.
--   payment_status='PAID' 단독 update만 우연히 통과되어 왔던 상태.

BEGIN;

-- ============================================================
-- 1) orders 누락 컬럼
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_key text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.orders.payment_key IS 'Toss Payments paymentKey (결제 식별자)';
COMMENT ON COLUMN public.orders.paid_at IS '결제 승인 완료 시각 (Toss confirm 응답 approvedAt 기준)';
COMMENT ON COLUMN public.orders.canceled_at IS '결제 취소(전액/부분) 완료 시각';
COMMENT ON COLUMN public.orders.cancellation_reason IS '취소 사유 (사용자/관리자 입력)';

-- payment_key는 결제 1건당 고유. NULL은 다중 허용.
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_key_unique
  ON public.orders (payment_key)
  WHERE payment_key IS NOT NULL;

-- ============================================================
-- 2) payment_logs - 결제 승인/취소 모든 시도 audit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_key text,
  amount integer,
  method text,                         -- 카드/계좌이체/가상계좌 등
  status text NOT NULL,                -- SUCCESS / FAILED / CANCELED / PARTIAL_CANCELED
  provider text DEFAULT 'TOSS',
  is_extra_charge boolean DEFAULT false,
  response_data jsonb,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_logs IS '결제 승인/취소 audit 로그 (멱등 비교, 정산 대조용)';

CREATE INDEX IF NOT EXISTS payment_logs_order_id_idx
  ON public.payment_logs (order_id);
CREATE INDEX IF NOT EXISTS payment_logs_payment_key_idx
  ON public.payment_logs (payment_key);
CREATE INDEX IF NOT EXISTS payment_logs_created_at_idx
  ON public.payment_logs (created_at DESC);

-- RLS: 서비스롤만 직접 접근. 사용자/관리자 조회는 별도 view/RPC 사용 권장.
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_logs_service_only ON public.payment_logs;
CREATE POLICY payment_logs_service_only
  ON public.payment_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 3) webhook_logs - Toss webhook 수신 audit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'TOSS',
  event_type text NOT NULL,
  order_id text,                       -- Toss orderId (UUID 또는 EXTRA_*/MODO_* 형태)
  payment_key text,
  raw jsonb NOT NULL,
  signature_ok boolean,                -- 시크릿 검증 결과
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  process_error text
);

COMMENT ON TABLE public.webhook_logs IS 'Toss webhook 수신 원본 audit (재처리/감사용)';

CREATE INDEX IF NOT EXISTS webhook_logs_received_at_idx
  ON public.webhook_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_event_type_idx
  ON public.webhook_logs (event_type);
CREATE INDEX IF NOT EXISTS webhook_logs_order_id_idx
  ON public.webhook_logs (order_id);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_logs_service_only ON public.webhook_logs;
CREATE POLICY webhook_logs_service_only
  ON public.webhook_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

COMMIT;
