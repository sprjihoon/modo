-- ============================================
-- notifications 테이블에 알림톡 관련 컬럼 추가
-- ============================================
-- 작성일: 2026-01-21
-- 설명: 카카오 알림톡 발송 상태 추적을 위한 컬럼 추가

-- 알림톡 발송 여부 컬럼
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'alimtalk_sent'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN alimtalk_sent BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN public.notifications.alimtalk_sent IS '카카오 알림톡 발송 여부';
  END IF;
END $$;

-- 알림톡 발송 일시 컬럼
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'alimtalk_sent_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN alimtalk_sent_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.notifications.alimtalk_sent_at IS '카카오 알림톡 발송 일시';
  END IF;
END $$;

-- FCM 발송 여부 컬럼 (기존에 없을 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'fcm_sent'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN fcm_sent BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN public.notifications.fcm_sent IS 'FCM 푸시 발송 여부';
  END IF;
END $$;

-- FCM 발송 일시 컬럼 (기존에 없을 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'fcm_sent_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN fcm_sent_at TIMESTAMPTZ;
    COMMENT ON COLUMN public.notifications.fcm_sent_at IS 'FCM 푸시 발송 일시';
  END IF;
END $$;

-- data 컬럼이 없으면 추가 (metadata 대신 data 사용하는 경우 대비)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'data'
  ) THEN
    -- metadata가 있으면 그대로 사용
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
      RAISE NOTICE 'metadata 컬럼 존재, data 컬럼 추가 스킵';
    ELSE
      ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '✅ notifications 테이블 알림톡 컬럼 추가 완료';
  RAISE NOTICE '   - alimtalk_sent: 알림톡 발송 여부';
  RAISE NOTICE '   - alimtalk_sent_at: 알림톡 발송 일시';
  RAISE NOTICE '   - fcm_sent: FCM 발송 여부';
  RAISE NOTICE '   - fcm_sent_at: FCM 발송 일시';
END $$;

