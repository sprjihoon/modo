-- CS 처리(재작업 · 수선비 환불 · 전손·분실 보상) + 회차
-- 2026-08-20

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cs_cycle integer NOT NULL DEFAULT 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cs_status text;

COMMENT ON COLUMN public.orders.cs_cycle IS '현재 CS 회차. 1=최초, 2부터 재작업';
COMMENT ON COLUMN public.orders.cs_status IS 'REWORK | REPAIR_REFUNDED | COMPENSATED | null';

CREATE TABLE IF NOT EXISTS public.order_cs_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  cycle integer NOT NULL DEFAULT 1,
  action text NOT NULL,
  reason text NOT NULL,
  amount integer,
  residual_value integer,
  payout_method text,
  payout_status text,
  refund_repair_fee boolean NOT NULL DEFAULT false,
  clothes_location text,
  pickup_date date,
  actor_id uuid,
  actor_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_cs_events_order_id
  ON public.order_cs_events (order_id, created_at DESC);

COMMENT ON TABLE public.order_cs_events IS '관리자 CS 결정 이력 (재작업/수선비환불/전손보상)';

ALTER TABLE public.order_cs_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own order cs events" ON public.order_cs_events;
CREATE POLICY "Customers can view own order cs events"
  ON public.order_cs_events
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view order cs events" ON public.order_cs_events;
CREATE POLICY "Staff can view order cs events"
  ON public.order_cs_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')
    )
  );
