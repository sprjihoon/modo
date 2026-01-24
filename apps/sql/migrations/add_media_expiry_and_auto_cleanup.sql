-- ============================================
-- 영상 자동 삭제 기능 (60일 후 만료)
-- ============================================

-- 1. media 테이블에 만료 관련 컬럼 추가
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 1;

-- 만료일 인덱스 (자동 삭제 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_media_expires_at ON public.media(expires_at) 
WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN public.media.expires_at IS '영상 만료일 (Cloudflare에서도 동시 삭제됨)';
COMMENT ON COLUMN public.media.duration_seconds IS '영상 길이(초)';
COMMENT ON COLUMN public.media.sequence IS '동일 주문 내 영상 순서';

-- 2. 기존 영상에 만료일 설정 (생성일 + 60일)
UPDATE public.media 
SET expires_at = created_at + INTERVAL '60 days'
WHERE expires_at IS NULL;

-- 3. 만료된 영상 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_expired_media()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  expired_record RECORD;
BEGIN
  deleted_count := 0;
  
  -- 만료된 영상 조회 및 삭제
  FOR expired_record IN 
    SELECT id, path, provider, type, final_waybill_no
    FROM public.media
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW()
    LIMIT 100  -- 한 번에 최대 100개 처리
  LOOP
    -- DB에서 삭제 (Cloudflare는 scheduledDeletion으로 자동 삭제됨)
    DELETE FROM public.media WHERE id = expired_record.id;
    deleted_count := deleted_count + 1;
    
    RAISE NOTICE '🗑️ Deleted expired media: % (type: %, waybill: %)', 
      expired_record.path, expired_record.type, expired_record.final_waybill_no;
  END LOOP;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE '✅ Total deleted: % expired media records', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- 4. pg_cron으로 매일 자정에 만료 영상 정리 (Supabase에서 pg_cron 활성화 필요)
-- Supabase Dashboard > Database > Extensions > pg_cron 활성화 후 실행

-- pg_cron이 활성화되어 있는지 확인
DO $$
BEGIN
  -- pg_cron 확장이 있으면 스케줄 등록
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- 기존 스케줄 삭제 (중복 방지)
    PERFORM cron.unschedule('cleanup-expired-media');
    
    -- 매일 새벽 3시에 만료 영상 정리
    PERFORM cron.schedule(
      'cleanup-expired-media',
      '0 3 * * *',  -- 매일 03:00 UTC
      $$SELECT cleanup_expired_media()$$
    );
    
    RAISE NOTICE '✅ pg_cron 스케줄 등록 완료: 매일 03:00 UTC에 만료 영상 정리';
  ELSE
    RAISE NOTICE '⚠️ pg_cron 확장이 없습니다. Supabase Dashboard에서 활성화해주세요.';
    RAISE NOTICE '   Database > Extensions > pg_cron 검색 후 Enable';
  END IF;
END $$;

-- 5. 만료 예정 영상 조회 뷰 (관리자용)
CREATE OR REPLACE VIEW public.media_expiry_status AS
SELECT 
  m.id,
  m.final_waybill_no,
  m.type,
  m.path as video_id,
  m.created_at,
  m.expires_at,
  CASE 
    WHEN m.expires_at IS NULL THEN '만료 없음'
    WHEN m.expires_at < NOW() THEN '만료됨'
    WHEN m.expires_at < NOW() + INTERVAL '7 days' THEN '7일 내 만료'
    WHEN m.expires_at < NOW() + INTERVAL '30 days' THEN '30일 내 만료'
    ELSE '정상'
  END as status,
  GREATEST(0, EXTRACT(DAY FROM (m.expires_at - NOW())))::INTEGER as days_remaining
FROM public.media m
ORDER BY m.expires_at ASC NULLS LAST;

COMMENT ON VIEW public.media_expiry_status IS '영상 만료 상태 모니터링 뷰';

-- 6. 수동 정리 실행용 (테스트 또는 긴급 시)
-- SELECT cleanup_expired_media();

-- 7. 만료 현황 확인
-- SELECT status, COUNT(*) FROM media_expiry_status GROUP BY status;

