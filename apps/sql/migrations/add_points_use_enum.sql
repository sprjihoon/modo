DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'point_transaction_type' AND e.enumlabel = 'USE_RESTORE'
  ) THEN
    ALTER TYPE point_transaction_type ADD VALUE 'USE_RESTORE';
  END IF;
END $$;
