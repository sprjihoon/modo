-- ============================================
-- FAQ (자주 묻는 질문) 관리 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP INDEX IF EXISTS public.idx_faqs_display_order;
CREATE INDEX idx_faqs_display_order ON public.faqs(display_order);

DROP INDEX IF EXISTS public.idx_faqs_is_active;
CREATE INDEX idx_faqs_is_active ON public.faqs(is_active);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can view all faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can insert faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can update faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can delete faqs" ON public.faqs;

-- 고객(anon/authenticated): 활성 FAQ만 조회
-- 관리자 쓰기는 service role(API)이 RLS를 우회
CREATE POLICY "Anyone can view active faqs"
  ON public.faqs
  FOR SELECT
  USING (is_active = true);

GRANT SELECT ON public.faqs TO anon;
GRANT SELECT ON public.faqs TO authenticated;

CREATE OR REPLACE FUNCTION update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faqs_updated_at ON public.faqs;
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_faqs_updated_at();

-- 기본 FAQ 시드 (테이블이 비어 있을 때만)
INSERT INTO public.faqs (question, answer, display_order, is_active)
SELECT * FROM (VALUES
  (
    '이용 방법이 궁금해요',
    '수선 항목을 선택하고 수거 희망일을 지정한 뒤 결제하면, 지정하신 날짜에 우체국 집배원이 방문 수거합니다. 수선 전·후 사진을 제공한 뒤 전문 수선이 진행되고, 완료되면 고객님 주소로 배송됩니다.',
    1,
    true
  ),
  (
    '수선에는 얼마나 걸리나요?',
    '결제 후 수거까지 보통 1~2 영업일, 수거 완료 후 수선·발송까지 총 3~5 영업일이 소요됩니다. (주말·공휴일 제외)',
    2,
    true
  ),
  (
    '수거·배송비는 얼마인가요?',
    '왕복 배송비 7,000원이 수선 요금과 별도로 청구됩니다. 도서산간 지역은 추가 배송비가 발생할 수 있으며, 결제 단계에서 안내됩니다.',
    3,
    true
  ),
  (
    '의류는 어떻게 수거하나요?',
    '우체국 방문 수거를 이용합니다. 주문 시 원하시는 수거 희망일을 선택하면, 해당 날짜에 우체국 집배원이 직접 방문해 수거합니다.',
    4,
    true
  ),
  (
    '치수는 어떻게 재나요?',
    '주문 과정에서 치수 측정 가이드를 제공합니다. ‘수선할 의류’와 ‘평소 잘 맞는 의류’를 준비한 뒤 안내에 따라 측정해 주세요. 가이드는 주문 화면과 이용 가이드에서 확인할 수 있습니다.',
    5,
    true
  ),
  (
    '취소·환불은 어떻게 되나요?',
    '수거 전(예약 단계)에는 전액 환불이 가능합니다. 수거·입고 후에는 왕복 배송비가 차감된 뒤 부분 환불되며 의류는 반송됩니다. 수선 작업이 시작된 이후에는 원칙적으로 취소가 어렵습니다. 회사 귀책(불량, 의뢰 내용과 다른 작업 등)은 전액 환불 또는 무상 재작업을 제공합니다. 환불은 카드사 기준으로 보통 3~7 영업일 소요됩니다.',
    6,
    true
  ),
  (
    '포인트는 어떻게 사용하나요?',
    '결제 화면에서 보유 포인트를 사용할 수 있습니다. 최소 1,000P부터 적용 가능하며, 전액 포인트 결제도 지원합니다. 친구 초대·회원가입 등으로 적립된 포인트도 동일하게 사용할 수 있습니다.',
    7,
    true
  ),
  (
    '문의는 어디로 하면 되나요?',
    '고객센터에서 카카오톡 문의 또는 전화 문의를 이용할 수 있습니다. 운영시간은 평일 기준이며, 점심시간과 주말·공휴일 휴무는 고객센터 화면에 안내된 내용을 확인해 주세요.',
    8,
    true
  )
) AS v(question, answer, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs LIMIT 1);
