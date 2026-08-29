-- 고객 작성 리뷰는 주문에 묶인다. 운영 홈 노출용 리뷰는 주문 없이 둘 수 있다.
ALTER TABLE public.reviews
  ALTER COLUMN order_id DROP NOT NULL;

COMMENT ON COLUMN public.reviews.order_id IS '고객 작성 리뷰의 주문. 운영 노출용(어드민 등록)은 NULL';

-- 운영 홈에 쓸 텍스트 리뷰 4건. 실제 고객 주문/포인트와 연결하지 않는다.
INSERT INTO public.users (email, name, phone, role, profile_completed)
SELECT
  'reviews-display@modo.io.kr',
  '리뷰노출',
  '01000000001',
  'CUSTOMER',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'reviews-display@modo.io.kr'
);

INSERT INTO public.reviews (
  user_id,
  rating,
  content,
  photo_urls,
  status,
  display_name,
  repair_summary,
  points_awarded,
  points_type,
  is_featured,
  display_order,
  reviewed_at,
  moderated_at
)
SELECT
  u.id,
  s.rating,
  s.content,
  '{}',
  'approved',
  s.display_name,
  s.repair_summary,
  0,
  'text',
  true,
  s.display_order,
  s.reviewed_at,
  NOW()
FROM public.users u
CROSS JOIN (
  VALUES
    (
      1,
      5,
      '기장이 딱 맞게 나왔어요. 택배 수거도 편하고 마감이 깔끔합니다.',
      '김**',
      '바지 · 기장수선',
      TIMESTAMPTZ '2026-08-20 09:00:00+00'
    ),
    (
      2,
      5,
      '지퍼 교체했는데 새 옷처럼 됐습니다. 마감이 꼼꼼합니다.',
      '이**',
      '점퍼 · 지퍼수선',
      TIMESTAMPTZ '2026-08-18 09:00:00+00'
    ),
    (
      3,
      5,
      '허리 수선이 자연스러워요. 입었을 때 라인도 예쁘고 만족합니다.',
      '박**',
      '스커트 · 허리수선',
      TIMESTAMPTZ '2026-08-15 09:00:00+00'
    ),
    (
      4,
      5,
      '코트 단추와 안감까지 신경 써 주셨어요. 다음에도 여기로 맡기려고요.',
      '정**',
      '코트 · 단추수선',
      TIMESTAMPTZ '2026-08-05 09:00:00+00'
    )
) AS s(display_order, rating, content, display_name, repair_summary, reviewed_at)
WHERE u.email = 'reviews-display@modo.io.kr'
  AND NOT EXISTS (
    SELECT 1
    FROM public.reviews r
    WHERE r.user_id = u.id
      AND r.display_order = s.display_order
      AND r.order_id IS NULL
  );
