-- orders 테이블에 pickup_date 컬럼 추가 (없는 경우만)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_date date;
