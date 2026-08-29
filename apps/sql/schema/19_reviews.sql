-- ============================================
-- 모두의수선 - 고객 리뷰
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  text_review_points INTEGER NOT NULL DEFAULT 200
    CHECK (text_review_points >= 0),
  photo_review_points INTEGER NOT NULL DEFAULT 500
    CHECK (photo_review_points >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_content_length INTEGER NOT NULL DEFAULT 10
    CHECK (min_content_length >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.review_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'hidden')),
  display_name TEXT NOT NULL,
  repair_summary TEXT,
  clothing_type TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  points_type TEXT CHECK (points_type IN ('photo', 'text')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_order_id_unique UNIQUE (order_id),
  CONSTRAINT reviews_content_not_blank CHECK (char_length(btrim(content)) >= 1)
);

CREATE INDEX IF NOT EXISTS idx_reviews_status_rating
  ON public.reviews (status, rating DESC, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_featured_order
  ON public.reviews (display_order ASC)
  WHERE is_featured AND status = 'approved';

CREATE INDEX IF NOT EXISTS idx_reviews_approved_clothing
  ON public.reviews (clothing_type)
  WHERE status = 'approved';

ALTER TABLE public.review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view review settings" ON public.review_settings;
CREATE POLICY "Anyone can view review settings"
  ON public.review_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Approved reviews are public" ON public.reviews;
CREATE POLICY "Approved reviews are public"
  ON public.reviews
  FOR SELECT
  USING (
    status = 'approved'
    OR user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view review-images" ON storage.objects;
CREATE POLICY "Anyone can view review-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "Authenticated users can upload review-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload review-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own review-images" ON storage.objects;
CREATE POLICY "Users can delete own review-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON TABLE public.reviews IS '고객 수선 리뷰. 작성자는 즉시 조회, 타인에게는 승인 후 공개';
COMMENT ON COLUMN public.reviews.rating IS '정수 별점 1~5 (반개 없음)';
COMMENT ON COLUMN public.reviews.display_name IS '공개용 마스킹 이름 (예: 김**)';
COMMENT ON COLUMN public.reviews.status IS 'pending=검수대기, approved=공개, hidden=비공개';
COMMENT ON COLUMN public.reviews.is_featured IS '관리자가 홈 미리보기에 노출하도록 지정';
COMMENT ON COLUMN public.reviews.display_order IS '홈 노출 순서 (작을수록 앞)';
COMMENT ON COLUMN public.reviews.clothing_type IS '의류 종류(수선 신청 대분류). 전체 리뷰 필터';
