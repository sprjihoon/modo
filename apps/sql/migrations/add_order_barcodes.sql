-- =============================================
-- 내부 바코드 시스템: order_barcodes 테이블
-- =============================================
-- 바코드 번호 형식: {order_number}-{seq:02d}
-- 예: ORD-20260706-001-01, ORD-20260706-001-02
-- 의류 1벌 N개 수선항목 → N개 바코드 생성
-- 어떤 바코드를 스캔해도 전체 작업지시서 조회 가능

CREATE TABLE IF NOT EXISTS public.order_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  barcode_no TEXT NOT NULL UNIQUE,  -- {order_number}-{seq:02d}
  seq INTEGER NOT NULL,             -- 1, 2, 3 ... (수선항목 순번)
  item_name TEXT,                   -- repair_parts[seq-1] 항목명
  printed_at TIMESTAMPTZ,           -- NULL: 미출력, 출력 시각 기록
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_barcodes_order ON public.order_barcodes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_barcodes_no ON public.order_barcodes(barcode_no);
CREATE INDEX IF NOT EXISTS idx_order_barcodes_printed ON public.order_barcodes(printed_at) WHERE printed_at IS NULL;

ALTER TABLE public.order_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role"
  ON public.order_barcodes FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.order_barcodes IS '내부 작업용 바코드 — order_number+시퀀스 형식';
COMMENT ON COLUMN public.order_barcodes.barcode_no IS '형식: {order_number}-{seq 2자리} 예: ORD-20260706-001-01';
COMMENT ON COLUMN public.order_barcodes.seq IS '수선항목 순번 (repair_parts 배열 인덱스+1)';
COMMENT ON COLUMN public.order_barcodes.item_name IS 'repair_parts 항목명 (앞 40자), 미등록 시 NULL';
COMMENT ON COLUMN public.order_barcodes.printed_at IS 'NULL=미출력, 출력 시각 기록';

DO $$ BEGIN
  RAISE NOTICE '✅ order_barcodes 테이블 생성 완료';
END $$;
