-- ============================================
-- 배너 관리 테이블 생성
-- ============================================

-- 배너 테이블 생성
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 배너 정보
  title TEXT NOT NULL,                    -- 배너 제목
  button_text TEXT NOT NULL,              -- 버튼 텍스트
  background_color TEXT NOT NULL,         -- 배경 색상 (HEX 코드)
  background_image_url TEXT,              -- 배경 이미지 URL (선택사항)
  
  -- 순서 및 활성화
  display_order INTEGER NOT NULL DEFAULT 0, -- 표시 순서
  is_active BOOLEAN NOT NULL DEFAULT true,  -- 활성화 여부
  
  -- 액션 설정
  action_type TEXT DEFAULT 'none',       -- 액션 타입: 'none', 'navigate', 'url'
  action_value TEXT,                     -- 액션 값 (라우트 경로 또는 URL)
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약 조건
  CONSTRAINT banners_display_order_check CHECK (display_order >= 0)
);

-- 인덱스 생성 (기존 인덱스가 있으면 삭제 후 재생성)
DROP INDEX IF EXISTS public.idx_banners_display_order;
CREATE INDEX idx_banners_display_order ON public.banners(display_order);

DROP INDEX IF EXISTS public.idx_banners_is_active;
CREATE INDEX idx_banners_is_active ON public.banners(is_active);

-- RLS 활성화
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- 정책 삭제 (기존 정책이 있으면 삭제 후 재생성)
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can view all banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;

-- 정책: 모든 사용자는 활성화된 배너만 조회 가능
CREATE POLICY "Anyone can view active banners"
  ON public.banners
  FOR SELECT
  USING (is_active = true);

-- 정책: 관리자는 모든 배너 조회/수정 가능
CREATE POLICY "Admins can view all banners"
  ON public.banners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can insert banners"
  ON public.banners
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can update banners"
  ON public.banners
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

CREATE POLICY "Admins can delete banners"
  ON public.banners
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modusrepair.com'
    )
  );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();

-- 기본 배너 데이터 삽입
INSERT INTO public.banners (title, button_text, background_color, display_order, is_active) VALUES
  (E'멀리 갈 필요 없이\n문앞에 두고', '첫 수거신청 하기', '#2D3E50', 1, true),
  (E'옷 수선,\n이제 집에서 간편하게', '수선 접수하기', '#00C896', 2, true),
  (E'수거부터 배송까지\n한 번에', '서비스 둘러보기', '#8B5CF6', 3, true)
ON CONFLICT DO NOTHING;

