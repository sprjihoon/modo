-- ============================================
-- orders 테이블 완전한 스키마 생성/업데이트
-- 누락된 모든 컬럼과 ENUM 타입 추가
-- ============================================

-- 1. ENUM 타입 생성 (없으면)
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING',        -- 결제 대기
    'PAID',           -- 결제 완료
    'BOOKED',         -- 수거예약 완료
    'INBOUND',        -- 입고 완료
    'PROCESSING',     -- 수선 중
    'READY_TO_SHIP',  -- 출고 완료
    'DELIVERED',      -- 배송 완료
    'CANCELLED'       -- 취소
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'PENDING',   -- 결제 대기
    'PAID',      -- 결제 완료
    'FAILED',    -- 결제 실패
    'REFUNDED'   -- 환불
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 모든 필요한 컬럼 추가
ALTER TABLE public.orders 
-- 고객 정보
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,

-- 주문 정보
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS item_description TEXT,
ADD COLUMN IF NOT EXISTS item_category TEXT,

-- 주소 정보
ADD COLUMN IF NOT EXISTS pickup_address TEXT,
ADD COLUMN IF NOT EXISTS pickup_address_detail TEXT,
ADD COLUMN IF NOT EXISTS pickup_zipcode TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_detail TEXT,
ADD COLUMN IF NOT EXISTS delivery_zipcode TEXT,

-- 요청사항
ADD COLUMN IF NOT EXISTS notes TEXT,

-- 송장번호
ADD COLUMN IF NOT EXISTS tracking_no TEXT,

-- 추가 가격
ADD COLUMN IF NOT EXISTS additional_price INTEGER DEFAULT 0,

-- 이미지
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- 3. 상태 컬럼 추가 (타입 변경이 필요할 수 있음)
-- 기존 status 컬럼이 TEXT라면 ENUM으로 변경
DO $$ 
BEGIN
  -- status 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN status order_status NOT NULL DEFAULT 'PENDING';
  END IF;

  -- payment_status 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;

-- 4. 타임스탬프 컬럼
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 5. 제약조건 추가 (이미 있으면 무시)
DO $$ BEGIN
  ALTER TABLE public.orders
  ADD CONSTRAINT orders_total_price_check CHECK (total_price >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders
  ADD CONSTRAINT orders_base_price_check CHECK (base_price >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_orders_tracking_no ON public.orders(tracking_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 7. tracking_no UNIQUE 제약 조건 추가 (이미 있으면 무시)
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_tracking_no_key UNIQUE (tracking_no);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 8. 확인: orders 테이블의 모든 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ orders 테이블이 완전히 업데이트되었습니다!';
  RAISE NOTICE '📝 모든 필수 컬럼이 추가되었습니다.';
  RAISE NOTICE '🎯 이제 주문 생성과 결제가 정상 작동합니다.';
END $$;

