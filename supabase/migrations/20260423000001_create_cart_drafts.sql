-- ============================================
-- 장바구니 임시저장 테이블 (크로스 디바이스 동기화)
-- ============================================
-- 모바일(Flutter)과 웹(Next.js) 양쪽에서 장바구니 항목을
-- 동일한 테이블에 저장하여 어떤 디바이스에서도 확인 가능.
-- draft_data 컬럼에 각 플랫폼의 JSON 구조를 그대로 저장.

CREATE TABLE IF NOT EXISTS public.cart_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  draft_data  JSONB       NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'mobile', -- 'mobile' | 'web'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.cart_drafts ENABLE ROW LEVEL SECURITY;

-- 본인 장바구니만 전체 접근 가능
CREATE POLICY "Users can manage own cart drafts"
  ON public.cart_drafts
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = cart_drafts.user_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_id FROM public.users WHERE id = cart_drafts.user_id
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_cart_drafts_user_id ON public.cart_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_drafts_created_at ON public.cart_drafts(created_at DESC);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_cart_drafts_updated_at
  BEFORE UPDATE ON public.cart_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  public.cart_drafts IS '크로스 디바이스 장바구니 임시저장 (모바일/웹 공용)';
COMMENT ON COLUMN public.cart_drafts.draft_data IS '플랫폼별 장바구니 항목 JSON (CartItem / CartDraftItem)';
COMMENT ON COLUMN public.cart_drafts.source IS '저장 플랫폼: mobile | web';
