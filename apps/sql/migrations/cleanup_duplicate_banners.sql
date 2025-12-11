-- ============================================
-- 배너 중복 데이터 정리
-- ============================================

-- 1단계: 중복 배너 확인
SELECT 
  title,
  button_text,
  display_order,
  COUNT(*) as count,
  array_agg(id) as ids
FROM public.banners
GROUP BY title, button_text, display_order
HAVING COUNT(*) > 1
ORDER BY display_order;

-- 2단계: 중복 배너 삭제 (가장 오래된 것만 남기고 나머지 삭제)
-- 같은 title, button_text, display_order를 가진 배너 중 created_at이 가장 오래된 것만 유지
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY title, button_text, display_order 
           ORDER BY created_at ASC
         ) as rn
  FROM public.banners
)
DELETE FROM public.banners
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 3단계: 정리 후 배너 목록 확인
SELECT 
  id,
  title,
  button_text,
  display_order,
  is_active,
  created_at
FROM public.banners
ORDER BY display_order, created_at;

-- 4단계: 최종 개수 확인 (3개여야 함)
SELECT COUNT(*) as total_banners FROM public.banners;

