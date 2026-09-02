-- 광고 첫유입(가입) · 결제주문 귀속 · 광고비
-- 동일: apps/edge/supabase/migrations/20260902120000_ad_attribution.sql

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS acq_source TEXT,
  ADD COLUMN IF NOT EXISTS acq_medium TEXT,
  ADD COLUMN IF NOT EXISTS acq_campaign TEXT,
  ADD COLUMN IF NOT EXISTS acq_content TEXT,
  ADD COLUMN IF NOT EXISTS acq_term TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS acq_source TEXT,
  ADD COLUMN IF NOT EXISTS acq_medium TEXT,
  ADD COLUMN IF NOT EXISTS acq_campaign TEXT,
  ADD COLUMN IF NOT EXISTS acq_content TEXT,
  ADD COLUMN IF NOT EXISTS acq_term TEXT;

CREATE TABLE IF NOT EXISTS public.ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  campaign TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_spend_dates ON public.ad_spend (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_users_acq_source ON public.users (acq_source);
CREATE INDEX IF NOT EXISTS idx_orders_acq_source ON public.orders (acq_source);

ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;
