-- ============================================
-- 사용자 인덱스 추가
-- ============================================
-- 이름 검색 성능 향상을 위한 인덱스
-- (이메일은 변경 가능하므로 매칭 키로 사용하지 않음)

-- 이름 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- 이름 대소문자 구분 없는 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON public.users(LOWER(name));

-- auth_id 인덱스 (이미 있을 수 있지만 확인)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- 주석
COMMENT ON INDEX idx_users_name IS '이름 검색 성능 향상';
COMMENT ON INDEX idx_users_name_lower IS '대소문자 구분 없는 이름 검색';
COMMENT ON INDEX idx_users_auth_id IS 'auth_id 기반 사용자 조회 성능 향상';

