-- 고객이 핀 메모·배송 요청과 따로 남기는 수선 요청 메모
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_memo TEXT;

COMMENT ON COLUMN public.orders.customer_memo IS
  '고객 수선 요청 메모. 핀 메모·우체국 배송 요청(notes)과 별도. 작업지시서·어드민 주문상세에 표시';
