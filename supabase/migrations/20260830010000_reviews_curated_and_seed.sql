-- 고객 작성 리뷰는 주문에 묶인다. 운영 홈 노출용 리뷰는 주문 없이 둘 수 있다.
ALTER TABLE public.reviews
  ALTER COLUMN order_id DROP NOT NULL;

COMMENT ON COLUMN public.reviews.order_id IS '고객 작성 리뷰의 주문. 운영 노출용(어드민 등록)은 NULL';
