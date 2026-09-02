-- 광고 첫유입(가입) · 결제주문 귀속 · 광고비

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS acq_source TEXT,
  ADD COLUMN IF NOT EXISTS acq_medium TEXT,
  ADD COLUMN IF NOT EXISTS acq_campaign TEXT,
  ADD COLUMN IF NOT EXISTS acq_content TEXT,
  ADD COLUMN IF NOT EXISTS acq_term TEXT;

COMMENT ON COLUMN public.users.acq_source IS '가입 첫 유입 채널 (utm_source)';
COMMENT ON COLUMN public.users.acq_campaign IS '가입 첫 유입 캠페인';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS acq_source TEXT,
  ADD COLUMN IF NOT EXISTS acq_medium TEXT,
  ADD COLUMN IF NOT EXISTS acq_campaign TEXT,
  ADD COLUMN IF NOT EXISTS acq_content TEXT,
  ADD COLUMN IF NOT EXISTS acq_term TEXT;

COMMENT ON COLUMN public.orders.acq_source IS '결제 직전 유입 채널 (utm_source)';
COMMENT ON COLUMN public.orders.acq_campaign IS '결제 직전 유입 캠페인';

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
