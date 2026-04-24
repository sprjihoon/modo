-- 결제대기(PENDING_PAYMENT) 상태 폐지에 따른 기존 주문 정리
--
-- 배경:
--   기존 흐름: 픽업폼 완료 → 즉시 PENDING_PAYMENT 주문 생성 → /payment 이동.
--   결제 안 끝내면 좀비 PENDING_PAYMENT 주문이 영구 잔존.
-- 신규 흐름:
--   주문은 결제 성공 시점(payments-confirm-toss / 0원 free order)에만 생성.
--   PENDING_PAYMENT 상태는 더 이상 코드에서 만들지 않음.
-- 이 마이그레이션:
--   잔존 PENDING_PAYMENT row를 모두 CANCELLED 처리.
--   payment_status는 건드리지 않음 (애초에 결제가 시작도 안 된 row가 대부분).

UPDATE orders
SET
  status = 'CANCELLED',
  cancellation_reason = COALESCE(cancellation_reason, 'legacy_pending_payment_cleanup'),
  canceled_at = COALESCE(canceled_at, NOW())
WHERE status = 'PENDING_PAYMENT';
