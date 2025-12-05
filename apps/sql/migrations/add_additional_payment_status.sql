-- orders 테이블에 추가 결제 관련 상태 추가

-- 기존 status에 새로운 값 추가 (TEXT 타입이므로 추가만 하면 됨)
-- 새로운 status 값:
-- - WAITING_ADDITIONAL_PAYMENT: 추가 결제 대기 중
-- - ADDITIONAL_PAYMENT_REJECTED: 추가 결제 거부됨
-- - READY_FOR_OUTBOUND: 출고 준비 완료

-- payment_status에 새로운 값 추가
-- 새로운 payment_status 값:
-- - WAITING_ADDITIONAL: 추가 결제 대기 중
-- - FULLY_PAID: 모든 결제 완료 (초기 + 추가)
-- - PARTIALLY_REFUNDED: 부분 환불
-- - REFUNDED: 전액 환불

-- 참고: TEXT 타입을 사용 중이므로 별도 ALTER 불필요
-- 애플리케이션 레벨에서 새로운 status 값을 사용하면 됨

-- 코멘트 추가
COMMENT ON COLUMN orders.status IS '
주문 상태:
- PENDING: 대기 중
- PAID: 결제 완료
- BOOKED: 수거 예약됨
- PICKED_UP: 수거 완료
- IN_WORK: 작업 중
- WAITING_ADDITIONAL_PAYMENT: 추가 결제 대기
- ADDITIONAL_PAYMENT_REJECTED: 추가 결제 거부
- READY_FOR_OUTBOUND: 출고 준비 완료
- COMPLETED: 완료
- CANCELLED: 취소
';

COMMENT ON COLUMN orders.payment_status IS '
결제 상태:
- PENDING: 결제 대기
- PAID: 초기 결제 완료
- WAITING_ADDITIONAL: 추가 결제 대기
- FULLY_PAID: 모든 결제 완료
- PARTIALLY_REFUNDED: 부분 환불
- REFUNDED: 전액 환불
- FAILED: 결제 실패
';

-- additional_payments 테이블 생성 (위에서 만든 스키마 실행)
-- 이미 생성되어 있다면 건너뛰기

