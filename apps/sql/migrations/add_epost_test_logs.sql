-- 우체국 API 자유 수거/발송 테스트 로그 테이블
-- 관리자 페이지에서 임의 주소 A → B 로 우체국 API를 호출한 결과를 저장
-- 기존 shipments / orders 테이블과 완전히 분리되어 운영됨 (기존 기능 영향 0)

CREATE TABLE IF NOT EXISTS public.epost_test_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 요청 파라미터 (보내는 사람)
  sender_name     text NOT NULL,
  sender_zipcode  text NOT NULL,
  sender_address  text NOT NULL,
  sender_address_detail text,
  sender_phone    text NOT NULL,

  -- 요청 파라미터 (받는 사람)
  receiver_name   text NOT NULL,
  receiver_zipcode text NOT NULL,
  receiver_address text NOT NULL,
  receiver_address_detail text,
  receiver_phone  text NOT NULL,

  -- 소포 정보
  shipment_type   text NOT NULL CHECK (shipment_type IN ('pickup', 'delivery')),
  pay_type        text NOT NULL CHECK (pay_type IN ('1', '2')),
  goods_name      text,
  weight_kg       numeric,
  volume_cm       numeric,
  delivery_message text,

  -- 우체국 응답
  status          text NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CANCELLED', 'CANCEL_FAILED', 'BOOK_FAILED')),
  tracking_no     text,
  req_no          text,
  res_no          text,
  appr_no         text,
  req_type        text,
  regi_po_nm      text,
  res_date        text,
  price           text,
  raw_request     jsonb,
  raw_response    jsonb,

  -- 취소 관련
  cancelled_at    timestamptz,
  cancel_response jsonb,

  -- 비고
  note            text
);

CREATE INDEX IF NOT EXISTS idx_epost_test_logs_created_at ON public.epost_test_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_epost_test_logs_status ON public.epost_test_logs (status);
CREATE INDEX IF NOT EXISTS idx_epost_test_logs_tracking_no ON public.epost_test_logs (tracking_no);

-- RLS: service_role / 인증된 admin 만 사용
ALTER TABLE public.epost_test_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epost_test_logs_admin_all" ON public.epost_test_logs;
CREATE POLICY "epost_test_logs_admin_all"
  ON public.epost_test_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'MANAGER', 'WORKER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('ADMIN', 'MANAGER', 'WORKER')
    )
  );

COMMENT ON TABLE public.epost_test_logs IS '우체국 API 자유 수거/발송 테스트 로그 (관리자 전용, 기존 shipments/orders 와 무관)';
