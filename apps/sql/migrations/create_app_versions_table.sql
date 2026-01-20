-- =====================================================
-- 앱 버전 관리 테이블 (업데이트 알림용)
-- =====================================================
-- 실행 방법: Supabase SQL Editor에서 실행
-- 용도: 앱 업데이트 알림 및 강제 업데이트 기능
-- =====================================================

-- 앱 버전 관리 테이블
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  latest_version TEXT NOT NULL,          -- 최신 버전 (예: "1.2.0")
  min_version TEXT NOT NULL,             -- 강제 업데이트 최소 버전
  store_url TEXT NOT NULL,               -- 스토어 URL
  update_message TEXT DEFAULT '새로운 기능이 추가되었습니다. 업데이트해 주세요!',
  update_message_en TEXT DEFAULT 'New features have been added. Please update!',
  is_force_update BOOLEAN DEFAULT false, -- 강제 업데이트 여부
  is_active BOOLEAN DEFAULT true,        -- 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 플랫폼별 하나의 레코드만 유지
  UNIQUE(platform)
);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_app_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_versions_updated_at ON app_versions;
CREATE TRIGGER trigger_update_app_versions_updated_at
  BEFORE UPDATE ON app_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_versions_updated_at();

-- RLS 정책 설정
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능 (앱에서 버전 체크용)
DROP POLICY IF EXISTS "Anyone can read app versions" ON app_versions;
CREATE POLICY "Anyone can read app versions" ON app_versions
  FOR SELECT USING (true);

-- 관리자만 수정 가능 (service_role 사용)
-- 일반 사용자는 INSERT, UPDATE, DELETE 불가

-- =====================================================
-- 초기 데이터 삽입
-- ⚠️ 스토어 등록 후 store_url을 실제 URL로 변경하세요!
-- =====================================================

INSERT INTO app_versions (platform, latest_version, min_version, store_url, update_message) 
VALUES 
  (
    'android', 
    '1.0.0', 
    '1.0.0', 
    'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_ID',  -- TODO: 실제 패키지 ID로 변경
    '새로운 기능이 추가되었습니다. 업데이트해 주세요!'
  ),
  (
    'ios', 
    '1.0.0', 
    '1.0.0', 
    'https://apps.apple.com/app/idYOUR_APP_ID',  -- TODO: 실제 Apple ID로 변경
    '새로운 기능이 추가되었습니다. 업데이트해 주세요!'
  )
ON CONFLICT (platform) DO NOTHING;

-- =====================================================
-- 버전 업데이트 예시 (나중에 사용)
-- =====================================================

-- 예시 1: Android 최신 버전 업데이트
-- UPDATE app_versions 
-- SET latest_version = '1.1.0', 
--     update_message = '새로운 기능: 주문 추적 개선!'
-- WHERE platform = 'android';

-- 예시 2: 강제 업데이트 설정 (중요한 보안 패치 등)
-- UPDATE app_versions 
-- SET min_version = '1.1.0', 
--     is_force_update = true,
--     update_message = '중요한 보안 업데이트입니다. 반드시 업데이트해 주세요.'
-- WHERE platform = 'android';

-- 예시 3: 스토어 URL 업데이트 (등록 후)
-- UPDATE app_versions 
-- SET store_url = 'https://play.google.com/store/apps/details?id=com.modurepair.app'
-- WHERE platform = 'android';

-- UPDATE app_versions 
-- SET store_url = 'https://apps.apple.com/app/id1234567890'
-- WHERE platform = 'ios';

SELECT '✅ app_versions 테이블 생성 완료!' AS result;
SELECT * FROM app_versions;

