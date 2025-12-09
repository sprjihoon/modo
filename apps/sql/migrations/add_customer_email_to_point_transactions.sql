-- ============================================
-- 포인트 거래 내역에 고객 이메일 추가
-- ============================================
-- 표시용으로만 사용 (매칭 키로는 사용하지 않음)
-- 이메일은 변경 가능하므로 user_id(UUID)로만 매칭

-- 포인트 거래 테이블에 고객 이메일 컬럼 추가 (표시용)
ALTER TABLE public.point_transactions 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 기존 데이터에 대해 이메일 업데이트 (표시용)
UPDATE public.point_transactions pt
SET customer_email = u.email
FROM public.users u
WHERE pt.user_id = u.id 
AND pt.customer_email IS NULL;

-- 주석
COMMENT ON COLUMN public.point_transactions.customer_email IS '고객 이메일 (표시용, 매칭 키로는 user_id 사용)';

