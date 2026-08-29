-- 관리자가 홈에 노출할 리뷰와 순서를 지정
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reviews_featured_order
  ON public.reviews (display_order ASC)
  WHERE is_featured AND status = 'approved';

COMMENT ON COLUMN public.reviews.is_featured IS '관리자가 홈 미리보기에 노출하도록 지정';
COMMENT ON COLUMN public.reviews.display_order IS '홈 노출 순서 (작을수록 앞)';
