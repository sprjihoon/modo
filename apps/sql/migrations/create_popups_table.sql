-- ============================================
-- 홈 팝업 관리 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 표시 내용
  subtitle TEXT,                              -- 상단 작은 문구 (예: OPENING SOON)
  title TEXT NOT NULL,                        -- 메인 제목 (줄바꿈 \n 가능)
  highlight_text TEXT,                        -- 제목 내 강조 문구
  items JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ "title": "...", "description": "..." }]
  cta_text TEXT NOT NULL DEFAULT '확인',
  dismiss_label TEXT NOT NULL DEFAULT '오늘 그만보기',
  dismiss_hours INTEGER NOT NULL DEFAULT 24 CHECK (dismiss_hours >= 0),

  -- 노출 제어
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  display_priority INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS public.idx_popups_is_active;
CREATE INDEX idx_popups_is_active ON public.popups(is_active);

DROP INDEX IF EXISTS public.idx_popups_display_priority;
CREATE INDEX idx_popups_display_priority ON public.popups(display_priority DESC);

DROP INDEX IF EXISTS public.idx_popups_schedule;
CREATE INDEX idx_popups_schedule ON public.popups(starts_at, ends_at);

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active scheduled popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can view all popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can insert popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can update popups" ON public.popups;
DROP POLICY IF EXISTS "Admins can delete popups" ON public.popups;

-- 고객: 활성 + 기간 내 팝업만 조회
CREATE POLICY "Anyone can view active scheduled popups"
  ON public.popups
  FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );

CREATE POLICY "Admins can view all popups"
  ON public.popups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can insert popups"
  ON public.popups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can update popups"
  ON public.popups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can delete popups"
  ON public.popups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE OR REPLACE FUNCTION update_popups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_popups_updated_at ON public.popups;
CREATE TRIGGER update_popups_updated_at
  BEFORE UPDATE ON public.popups
  FOR EACH ROW
  EXECUTE FUNCTION update_popups_updated_at();

-- 기본: 웹 정식 오픈 안내 팝업
INSERT INTO public.popups (
  subtitle,
  title,
  highlight_text,
  items,
  cta_text,
  dismiss_label,
  dismiss_hours,
  is_active,
  display_priority
)
SELECT
  'OPENING SOON',
  E'웹 서비스\n정식 오픈 예정',
  '정식 오픈',
  '[
    {"title": "웹 서비스", "description": "9월 1일 정식 오픈 예정"},
    {"title": "Android · iOS", "description": "순차 오픈 예정"}
  ]'::jsonb,
  '확인',
  '오늘 그만보기',
  24,
  true,
  10
WHERE NOT EXISTS (
  SELECT 1 FROM public.popups WHERE title LIKE '%정식 오픈%'
);
