-- Migration: Create ops_center_settings table and add show_test_buttons setting
-- Description: 센터 설정 테이블 생성 및 테스트 버튼 표시 여부 제어

-- 1. ops_center_settings 테이블 생성 (없으면 생성)
CREATE TABLE IF NOT EXISTS ops_center_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  recipient_name TEXT DEFAULT '모두의수선',
  zipcode TEXT DEFAULT '41142',
  address1 TEXT DEFAULT '대구광역시 동구 동촌로 1',
  address2 TEXT DEFAULT '동대구우체국 2층 소포실 모두의수선',
  phone TEXT DEFAULT '01027239490',
  show_test_buttons BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ops_center_settings_single_row CHECK (id = 1)
);

-- 2. 기본 데이터 삽입 (없으면 삽입)
INSERT INTO ops_center_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- 3. 기존 테이블에 show_test_buttons 컬럼이 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ops_center_settings' 
    AND column_name = 'show_test_buttons'
  ) THEN
    ALTER TABLE ops_center_settings ADD COLUMN show_test_buttons BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4. 컬럼에 코멘트 추가
COMMENT ON TABLE ops_center_settings IS '센터(입고 도착지) 설정 및 개발자 설정';
COMMENT ON COLUMN ops_center_settings.show_test_buttons IS '모바일 앱 결제 페이지에서 테스트 버튼(Mock 수거예약, 실제 우체국 API) 표시 여부';

-- 5. RLS 활성화 및 정책 설정
ALTER TABLE ops_center_settings ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (모바일 앱에서 설정 조회 필요)
DROP POLICY IF EXISTS "ops_center_settings_read_all" ON ops_center_settings;
CREATE POLICY "ops_center_settings_read_all" ON ops_center_settings
  FOR SELECT USING (true);

-- 서비스 역할만 수정 가능
DROP POLICY IF EXISTS "ops_center_settings_write_service" ON ops_center_settings;
CREATE POLICY "ops_center_settings_write_service" ON ops_center_settings
  FOR ALL USING (auth.role() = 'service_role');
