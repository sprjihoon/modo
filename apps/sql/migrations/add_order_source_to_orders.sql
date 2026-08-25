-- 고객이 웹에서 주문했는지, 앱에서 주문했는지 구분
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_source_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_source_check
      CHECK (order_source IS NULL OR order_source IN ('web', 'app', 'ios', 'android'));
  END IF;
END $$;

COMMENT ON COLUMN public.orders.order_source IS '주문 접수 채널: web | app | ios | android';

CREATE INDEX IF NOT EXISTS idx_orders_order_source ON public.orders(order_source);
