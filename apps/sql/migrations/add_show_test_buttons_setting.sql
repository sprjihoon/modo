-- Migration: Add show_test_buttons setting to ops_center_settings
-- Description: 관리자 페이지에서 모바일 앱의 테스트 버튼(Mock 수거예약, 실제 우체국 API) 표시 여부를 제어

-- 1. ops_center_settings 테이블에 show_test_buttons 컬럼 추가
ALTER TABLE ops_center_settings 
ADD COLUMN IF NOT EXISTS show_test_buttons BOOLEAN DEFAULT false;

-- 2. 기존 데이터가 있으면 기본값 false로 설정
UPDATE ops_center_settings 
SET show_test_buttons = false 
WHERE show_test_buttons IS NULL;

-- 3. 컬럼에 코멘트 추가
COMMENT ON COLUMN ops_center_settings.show_test_buttons IS '모바일 앱 결제 페이지에서 테스트 버튼(Mock 수거예약, 실제 우체국 API) 표시 여부';
