-- 수선 항목 부분 취소 지원
-- 고객/관리자가 여러 수선 항목 중 일부만 취소할 수 있도록
-- 취소된 항목의 인덱스를 저장하는 컬럼 추가.
-- canceled_repair_parts = repair_parts 배열의 0-based 인덱스 목록

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS canceled_repair_parts integer[] DEFAULT '{}';

COMMENT ON COLUMN public.orders.canceled_repair_parts IS
  '취소된 수선 항목의 인덱스(0-based) 목록. repair_parts 배열 기준.';
