-- 포트원 V2 마이그레이션: Toss payment_key → PortOne payment_id
-- 
-- 변경 사항:
-- 1. orders.payment_key → orders.payment_id (컬럼 이름 변경)
-- 2. payment_logs.payment_key → payment_logs.payment_id
-- 3. extra_charge_requests.payment_key → extra_charge_requests.payment_id
-- 4. webhook_logs.payment_key → webhook_logs.payment_id
-- 5. payment_logs.provider 기본값 변경 TOSS → PORTONE

-- ── orders 테이블 ─────────────────────────────────────────────────────────

-- payment_key 컬럼이 있으면 payment_id 로 이름 변경
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_key'
  ) THEN
    -- payment_id 컬럼이 이미 있는 경우는 데이터 복사 후 payment_key 삭제
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'payment_id'
    ) THEN
      -- payment_id 가 NULL 인 행에 payment_key 값 복사
      UPDATE orders
      SET payment_id = payment_key
      WHERE payment_id IS NULL AND payment_key IS NOT NULL;

      -- payment_key 컬럼 제거
      ALTER TABLE orders DROP COLUMN payment_key;
    ELSE
      -- payment_id 가 없으면 단순 이름 변경
      ALTER TABLE orders RENAME COLUMN payment_key TO payment_id;
    END IF;
  END IF;
END $$;

-- payment_id 컬럼이 없으면 새로 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- 인덱스 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders (payment_id);

-- ── payment_logs 테이블 ───────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_logs' AND column_name = 'payment_key'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payment_logs' AND column_name = 'payment_id'
    ) THEN
      UPDATE payment_logs
      SET payment_id = payment_key
      WHERE payment_id IS NULL AND payment_key IS NOT NULL;
      ALTER TABLE payment_logs DROP COLUMN payment_key;
    ELSE
      ALTER TABLE payment_logs RENAME COLUMN payment_key TO payment_id;
    END IF;
  END IF;
END $$;

ALTER TABLE payment_logs
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- provider 기본값을 PORTONE 으로 (새 레코드 기준)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_logs' AND column_name = 'provider'
  ) THEN
    ALTER TABLE payment_logs
      ALTER COLUMN provider SET DEFAULT 'PORTONE';
  END IF;
END $$;

-- ── extra_charge_requests 테이블 ─────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extra_charge_requests' AND column_name = 'payment_key'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'extra_charge_requests' AND column_name = 'payment_id'
    ) THEN
      UPDATE extra_charge_requests
      SET payment_id = payment_key
      WHERE payment_id IS NULL AND payment_key IS NOT NULL;
      ALTER TABLE extra_charge_requests DROP COLUMN payment_key;
    ELSE
      ALTER TABLE extra_charge_requests RENAME COLUMN payment_key TO payment_id;
    END IF;
  END IF;
END $$;

ALTER TABLE extra_charge_requests
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- ── webhook_logs 테이블 ───────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'webhook_logs' AND column_name = 'payment_key'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'webhook_logs' AND column_name = 'payment_id'
    ) THEN
      UPDATE webhook_logs
      SET payment_id = payment_key
      WHERE payment_id IS NULL AND payment_key IS NOT NULL;
      ALTER TABLE webhook_logs DROP COLUMN payment_key;
    ELSE
      ALTER TABLE webhook_logs RENAME COLUMN payment_key TO payment_id;
    END IF;
  END IF;
END $$;

ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS payment_id TEXT;
