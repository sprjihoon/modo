-- 전체 리뷰를 수선 종류(의류 카테고리)로 거르기 위한 컬럼.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS clothing_type TEXT;

COMMENT ON COLUMN public.reviews.clothing_type IS '의류 종류(수선 신청 대분류). 전체 리뷰 필터';

CREATE INDEX IF NOT EXISTS idx_reviews_approved_clothing
  ON public.reviews (clothing_type)
  WHERE status = 'approved';

UPDATE public.reviews r
SET clothing_type = NULLIF(btrim(o.clothing_type), '')
FROM public.orders o
WHERE r.order_id = o.id
  AND (r.clothing_type IS NULL OR btrim(r.clothing_type) = '');

UPDATE public.reviews
SET clothing_type = NULLIF(btrim(split_part(repair_summary, '·', 1)), '')
WHERE clothing_type IS NULL
  AND repair_summary IS NOT NULL;

UPDATE public.reviews
SET clothing_type = CASE clothing_type
  WHEN '점퍼' THEN '아우터'
  WHEN '코트' THEN '아우터'
  WHEN '패딩' THEN '아우터'
  WHEN '자켓' THEN '아우터'
  WHEN '재킷' THEN '아우터'
  WHEN '스커트' THEN '치마'
  WHEN '팬츠' THEN '바지'
  ELSE clothing_type
END
WHERE clothing_type IN ('점퍼', '코트', '패딩', '자켓', '재킷', '스커트', '팬츠');
