-- ============================================
-- orders 테이블에 핀 정보 컬럼 추가
-- ============================================

-- 이미지와 핀 정보를 함께 저장하는 JSONB 컬럼 추가
-- 구조: [{ imagePath: string, pins: [{ id, relative_x, relative_y, memo }] }]
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS images_with_pins JSONB DEFAULT '[]'::jsonb;

-- 컬럼 주석
COMMENT ON COLUMN public.orders.images_with_pins IS '이미지 URL과 핀 정보 (위치, 메모)를 함께 저장';

-- 예시 데이터 구조:
-- [
--   {
--     "imagePath": "https://...",
--     "pins": [
--       {
--         "id": "uuid",
--         "relative_x": 0.5,
--         "relative_y": 0.3,
--         "memo": "소매 기장 3cm 줄이기",
--         "created_at": "2024-01-01T00:00:00Z"
--       }
--     ]
--   }
-- ]

