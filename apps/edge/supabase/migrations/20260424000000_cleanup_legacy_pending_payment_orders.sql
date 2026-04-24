-- 결제대기(PENDING_PAYMENT) 상태 폐지에 따른 기존 주문 완전 삭제
--
-- 배경:
--   기존 흐름: 픽업폼 완료 → 즉시 PENDING_PAYMENT 주문 생성 → /payment 이동.
--   결제 안 끝내면 좀비 PENDING_PAYMENT 주문이 영구 잔존 → 사용자 혼란/관리부하.
-- 신규 흐름:
--   주문은 결제 성공 시점(payments-confirm-toss / 0원 free order)에만 생성.
--   PENDING_PAYMENT 상태는 더 이상 코드에서 만들지 않음.
--
-- 이 마이그레이션:
--   잔존 PENDING_PAYMENT row 를 모두 **완전 삭제**.
--   종속 테이블들은 모두 ON DELETE CASCADE 또는 ON DELETE SET NULL 로 정의되어 있어
--   별도 정리 불필요 (shipments / payments / notifications / points / work_items …).
--   PENDING_PAYMENT 는 결제 시작 전 상태라 payment_logs / shipments 가 거의 없음.

DELETE FROM orders WHERE status = 'PENDING_PAYMENT';
