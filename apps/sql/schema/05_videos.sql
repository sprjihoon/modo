-- ============================================
-- 모두의수선 - 영상 테이블
-- ============================================

-- 영상 타입 ENUM
CREATE TYPE video_type AS ENUM (
  'INBOUND',   -- 입고 영상
  'OUTBOUND'   -- 출고 영상
);

-- 영상 상태 ENUM
CREATE TYPE video_status AS ENUM (
  'UPLOADING',  -- 업로드 중
  'PROCESSING', -- 처리 중 (Cloudflare Stream)
  'READY',      -- 재생 가능
  'FAILED',     -- 업로드 실패
  'DELETED'     -- 삭제됨
);

-- 영상 테이블
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 송장번호 (핵심 FK)
  tracking_no TEXT NOT NULL REFERENCES public.shipments(tracking_no) ON DELETE CASCADE,
  
  -- 영상 타입
  video_type video_type NOT NULL,
  
  -- Cloudflare Stream 정보
  cloudflare_video_id TEXT NOT NULL UNIQUE,
  stream_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- 영상 정보
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  resolution TEXT,
  
  -- 상태
  status video_status NOT NULL DEFAULT 'UPLOADING',
  
  -- 타임스탬프
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT videos_duration_check CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT videos_file_size_check CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

-- RLS 활성화
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 주문 영상만 조회 가능
CREATE POLICY "Users can view own videos"
  ON public.videos
  FOR SELECT
  USING (
    tracking_no IN (
      SELECT tracking_no FROM public.shipments
      WHERE order_id IN (
        SELECT id FROM public.orders
        WHERE user_id IN (
          SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
      )
    )
  );

-- 정책: 관리자는 모든 영상 관리 가능
CREATE POLICY "Admins can manage all videos"
  ON public.videos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_videos_tracking_no ON public.videos(tracking_no);
CREATE INDEX idx_videos_video_type ON public.videos(video_type);
CREATE INDEX idx_videos_cloudflare_id ON public.videos(cloudflare_video_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_uploaded_at ON public.videos(uploaded_at DESC);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 트리거: 영상 업로드 시 shipments 업데이트
CREATE OR REPLACE FUNCTION update_shipment_video()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.video_type = 'INBOUND' THEN
    UPDATE public.shipments
    SET inbound_video_id = NEW.id
    WHERE tracking_no = NEW.tracking_no;
  ELSIF NEW.video_type = 'OUTBOUND' THEN
    UPDATE public.shipments
    SET outbound_video_id = NEW.id
    WHERE tracking_no = NEW.tracking_no;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_video_insert
  AFTER INSERT ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_video();

-- 주석
COMMENT ON TABLE public.videos IS '입출고 영상 정보 (Cloudflare Stream)';
COMMENT ON COLUMN public.videos.cloudflare_video_id IS 'Cloudflare Stream 영상 ID';
COMMENT ON COLUMN public.videos.stream_url IS 'HLS 스트리밍 URL (.m3u8)';

