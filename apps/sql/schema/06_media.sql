-- ============================================
-- 모두의수선 - media 테이블 (Cloudflare Stream, R2 등 외부 미디어 경로 관리)
-- ============================================

CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 최종 운송장 번호 (전후 비교/출고 영상의 대표 식별자)
  final_waybill_no TEXT NOT NULL,

  -- 미디어 유형 (예: 'inbound_video', 'outbound_video', 'merged_video')
  type TEXT NOT NULL,

  -- 제공자 (예: 'cloudflare', 'r2', 'supabase')
  provider TEXT NOT NULL,

  -- 경로/식별자 (예: Cloudflare Stream videoId, 또는 서명 URL)
  path TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 색인
CREATE INDEX IF NOT EXISTS idx_media_final_waybill_no ON public.media(final_waybill_no);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media(type);
CREATE INDEX IF NOT EXISTS idx_media_provider ON public.media(provider);

-- RLS (개발 중에는 완화, 이후 정책 강화)
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'media' AND policyname = 'allow_all_media'
  ) THEN
    CREATE POLICY "allow_all_media"
      ON public.media
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.media IS '외부 저장(Cloudflare Stream/R2 등) 미디어 경로 관리';
COMMENT ON COLUMN public.media.final_waybill_no IS '최종 송장번호(전후 비교 기준)';
COMMENT ON COLUMN public.media.type IS '미디어 유형 (inbound_video/outbound_video/merged_video 등)';
COMMENT ON COLUMN public.media.provider IS '저장/제공자 구분';
COMMENT ON COLUMN public.media.path IS '비디오 ID 또는 서명 URL 등 접근 경로';


