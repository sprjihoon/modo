-- ============================================
-- 모두의수선 - 수선 메뉴 테이블
-- ============================================

-- 수선 카테고리 (의류 종류)
CREATE TABLE IF NOT EXISTS public.repair_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL UNIQUE,           -- 카테고리명 (예: 아우터, 티셔츠/맨투맨)
  display_order INT NOT NULL DEFAULT 0, -- 표시 순서
  icon_name TEXT,                       -- 아이콘 파일명 (예: outer.svg)
  is_active BOOLEAN NOT NULL DEFAULT true, -- 활성 여부
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 수선 종류 (카테고리별 수선 항목)
CREATE TABLE IF NOT EXISTS public.repair_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 카테고리 연결
  category_id UUID NOT NULL REFERENCES public.repair_categories(id) ON DELETE CASCADE,
  
  -- 수선 정보
  name TEXT NOT NULL,                   -- 수선명 (예: 소매기장 줄임)
  sub_type TEXT,                        -- 세부 타입 (예: 기본형, 단추구멍형, 지퍼형)
  description TEXT,                     -- 설명
  
  -- 가격 정보
  price INT NOT NULL,                   -- 가격
  
  -- 표시 및 상태
  display_order INT NOT NULL DEFAULT 0, -- 표시 순서
  is_active BOOLEAN NOT NULL DEFAULT true, -- 활성 여부
  
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT repair_types_unique_per_category UNIQUE (category_id, name, sub_type)
);

-- RLS 활성화
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_types ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 활성 메뉴 조회 가능
CREATE POLICY "Anyone can view active repair categories"
  ON public.repair_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view active repair types"
  ON public.repair_types
  FOR SELECT
  USING (is_active = true);

-- 정책: 관리자만 메뉴 관리 가능
CREATE POLICY "Admins can manage repair categories"
  ON public.repair_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

CREATE POLICY "Admins can manage repair types"
  ON public.repair_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@admin.modorepair.com'
    )
  );

-- 인덱스
CREATE INDEX idx_repair_categories_active ON public.repair_categories(is_active);
CREATE INDEX idx_repair_categories_order ON public.repair_categories(display_order);
CREATE INDEX idx_repair_types_category ON public.repair_types(category_id);
CREATE INDEX idx_repair_types_active ON public.repair_types(is_active);
CREATE INDEX idx_repair_types_order ON public.repair_types(display_order);

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_repair_categories_updated_at
  BEFORE UPDATE ON public.repair_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_types_updated_at
  BEFORE UPDATE ON public.repair_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 주석
COMMENT ON TABLE public.repair_categories IS '수선 카테고리 (의류 종류)';
COMMENT ON TABLE public.repair_types IS '수선 종류 (카테고리별 수선 항목)';

-- 샘플 데이터 (개발용)
INSERT INTO public.repair_categories (name, display_order, icon_name) VALUES
  ('아우터', 1, 'outer'),
  ('티셔츠/맨투맨', 2, 'tshirt'),
  ('셔츠/블라우스', 3, 'shirt'),
  ('원피스', 4, 'dress'),
  ('바지', 5, 'pants'),
  ('청바지', 6, 'jeans'),
  ('치마', 7, 'skirt')
ON CONFLICT (name) DO NOTHING;

-- 샘플 수선 종류 (아우터)
INSERT INTO public.repair_types (category_id, name, sub_type, price, display_order)
SELECT 
  id,
  name,
  sub_type,
  price,
  display_order
FROM (
  SELECT 
    (SELECT id FROM public.repair_categories WHERE name = '아우터') as id,
    '소매기장 줄임' as name,
    '기본형' as sub_type,
    15000 as price,
    1 as display_order
  UNION ALL SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), '소매기장 줄임', '단추구멍형', 18000, 2
  UNION ALL SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), '소매기장 줄임', '지퍼형', 18000, 3
  UNION ALL SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), '전체탈통 줄임', '기본형', 20000, 4
  UNION ALL SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), '전체탈통 줄임', '얇통', 18000, 5
  UNION ALL SELECT (SELECT id FROM public.repair_categories WHERE name = '아우터'), '전체탈통 줄임', '소매통', 18000, 6
) as sample_data
ON CONFLICT (category_id, name, sub_type) DO NOTHING;


