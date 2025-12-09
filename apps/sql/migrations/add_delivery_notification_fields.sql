-- shipments 테이블에 배송 알림 관련 필드 추가

-- 알림 메시지 (토요배달 휴무지역 등)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS notify_msg TEXT;

-- 공지사항
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS notice_cont TEXT;

-- 도서산간 부가요금
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS island_add_fee TEXT;

-- 정제 우편번호 (우체국 API에서 반환)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS refined_zipcode TEXT;

-- 정제 도로명주소 (우체국 API에서 반환)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS refined_address TEXT;

COMMENT ON COLUMN shipments.notify_msg IS '알림 메시지 (예: 토요배달 휴무지역)';
COMMENT ON COLUMN shipments.notice_cont IS '공지사항';
COMMENT ON COLUMN shipments.island_add_fee IS '도서산간 부가요금 (원)';
COMMENT ON COLUMN shipments.refined_zipcode IS '정제 우편번호';
COMMENT ON COLUMN shipments.refined_address IS '정제 도로명주소';
