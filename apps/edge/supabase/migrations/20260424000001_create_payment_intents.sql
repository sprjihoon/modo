-- 결제 인텐트 테이블
--
-- 배경:
--   PENDING_PAYMENT 폐지 후 흐름:
--     클라이언트가 픽업 폼 완료 → /api/orders/quote 호출
--       서버가 가격을 권위 있게 계산하고 payment_intents 에 저장 → intent_id 반환
--     클라이언트가 intent_id 를 Toss orderId 로 사용해 결제 위젯 호출
--     Toss 결제 성공 → payments-confirm-toss 가 intent_id 로 인텐트 조회
--       → 인텐트의 권위적 가격과 Toss 가 보고한 결제액이 일치하면
--          orders insert (PAID) + 인텐트 consumed 처리
--   결제 안 끝내면 인텐트는 그대로 만료 (cron 으로 청소 가능, 1시간 TTL)
--   금액 위변조 불가 — 권위적 가격은 서버에서만 결정.

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_price INTEGER NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  consumed_at TIMESTAMPTZ,
  consumed_order_id UUID
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_active
  ON payment_intents (user_id)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_expires
  ON payment_intents (expires_at)
  WHERE consumed_at IS NULL;

-- RLS: 사용자는 자기 인텐트만 조회/수정 가능 (생성은 Next.js API 가 service role 로 함)
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_payment_intents" ON payment_intents;
CREATE POLICY "users_select_own_payment_intents"
  ON payment_intents FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- service role 은 RLS 우회 (insert/update 는 서버에서만)

COMMENT ON TABLE payment_intents IS
  '결제 인텐트: 결제 시작 시 서버가 권위적 가격 + 픽업 페이로드를 임시 저장. 결제 성공 시 orders 로 변환됨.';
