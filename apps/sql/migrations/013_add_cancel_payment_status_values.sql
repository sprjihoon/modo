-- 013_add_cancel_payment_status_values.sql
-- payment_status ENUM에 'CANCELED' / 'PARTIAL_CANCELED' 값을 추가.
-- 발견 배경:
--   /api/orders/[id]/cancel (전액환불) 와 /api/orders/[id]/return-and-refund (부분환불)
--   가 orders.payment_status 를 'CANCELED' / 'PARTIAL_CANCELED' 로 set 하려 하지만
--   기존 enum 정의에는 PENDING/PAID/FAILED/REFUNDED 만 존재하여 update가 실패함.
--
-- ENUM 값 추가는 트랜잭션 외부에서 commit 되어야 하므로 BEGIN/COMMIT 묶지 않음.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CANCELED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'CANCELED' AFTER 'REFUNDED';
    RAISE NOTICE '[013] payment_status에 CANCELED 추가';
  ELSE
    RAISE NOTICE '[013] CANCELED 이미 존재';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PARTIAL_CANCELED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'PARTIAL_CANCELED' AFTER 'CANCELED';
    RAISE NOTICE '[013] payment_status에 PARTIAL_CANCELED 추가';
  ELSE
    RAISE NOTICE '[013] PARTIAL_CANCELED 이미 존재';
  END IF;
END $$;
