-- =====================================================
-- 네이버 로그인 지원을 위한 users 테이블 수정
-- 실행일: 2026-01-23
-- 목적: 네이버 소셜 로그인 연동을 위한 naver_id 컬럼 추가
-- =====================================================

-- 1. naver_id 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS naver_id TEXT UNIQUE;

-- 2. naver_id 인덱스 생성 (빠른 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_users_naver_id 
ON users(naver_id) 
WHERE naver_id IS NOT NULL;

-- 3. 소셜 로그인 provider 컬럼 추가 (선택사항)
-- 어떤 방식으로 가입했는지 추적
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

COMMENT ON COLUMN users.naver_id IS '네이버 로그인 사용자 고유 ID';
COMMENT ON COLUMN users.auth_provider IS '인증 제공자 (email, google, kakao, naver)';

-- 4. RLS 정책 확인 (기존 정책이 새 컬럼도 포함하는지)
-- 기존 RLS 정책이 SELECT * 형태라면 자동으로 포함됨

-- 5. 확인 쿼리
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('naver_id', 'auth_provider');

