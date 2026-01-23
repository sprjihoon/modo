-- =====================================================
-- 소셜 로그인 사용자 약관 동의 추적을 위한 마이그레이션
-- =====================================================
-- 목적: 소셜 로그인(카카오, 구글) 사용자가 약관에 동의했는지 추적
-- 법적 요구사항: 전자상거래법, 개인정보보호법 준수

-- 1. users 테이블에 약관 동의 관련 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS privacy_agreed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS marketing_agreed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. 프로필 완료 여부를 쉽게 체크하기 위한 컬럼
-- phone이 비어있거나 terms_agreed_at이 null이면 미완료
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.users.terms_agreed_at IS '이용약관 동의 일시 (필수)';
COMMENT ON COLUMN public.users.privacy_agreed_at IS '개인정보처리방침 동의 일시 (필수)';
COMMENT ON COLUMN public.users.marketing_agreed_at IS '마케팅 수신 동의 일시 (선택)';
COMMENT ON COLUMN public.users.profile_completed IS '프로필 완성 여부 (이름, 전화번호, 약관동의 모두 완료)';

-- 3. 기존 이메일 가입 사용자는 이미 약관에 동의한 것으로 간주
-- (회원가입 시 약관 동의를 받았으므로)
UPDATE public.users
SET 
  terms_agreed_at = COALESCE(created_at, NOW()),
  privacy_agreed_at = COALESCE(created_at, NOW()),
  profile_completed = TRUE
WHERE terms_agreed_at IS NULL
  AND phone IS NOT NULL 
  AND phone != ''
  AND name IS NOT NULL 
  AND name != ''
  AND name != '사용자';

-- 4. 트리거 함수 수정: 소셜 로그인 시 profile_completed = FALSE로 생성
CREATE OR REPLACE FUNCTION auto_create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_phone TEXT;
  user_email TEXT;
  is_social_login BOOLEAN;
  provider TEXT;
BEGIN
  -- 사용자 정보 추출
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'nickname',
    '사용자'
  );
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  
  -- 소셜 로그인 여부 확인
  provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  is_social_login := provider IN ('kakao', 'google', 'naver', 'apple');
  
  -- public.users에 프로필 생성
  INSERT INTO public.users (
    auth_id, 
    email, 
    name, 
    phone, 
    role,
    profile_completed,
    terms_agreed_at,
    privacy_agreed_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_name,
    user_phone,
    'CUSTOMER',
    -- 소셜 로그인은 프로필 미완료, 이메일 가입은 완료
    NOT is_social_login,
    -- 이메일 가입은 회원가입 페이지에서 동의했으므로 NOW()
    CASE WHEN NOT is_social_login THEN NOW() ELSE NULL END,
    CASE WHEN NOT is_social_login THEN NOW() ELSE NULL END
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    -- 기존 사용자가 있으면 업데이트하지 않음
    email = EXCLUDED.email
  WHERE public.users.email IS NULL OR public.users.email = '';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 프로필 완료 처리 함수
CREATE OR REPLACE FUNCTION complete_user_profile(
  p_auth_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_terms_agreed BOOLEAN DEFAULT TRUE,
  p_privacy_agreed BOOLEAN DEFAULT TRUE,
  p_marketing_agreed BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET 
    name = p_name,
    phone = p_phone,
    terms_agreed_at = CASE WHEN p_terms_agreed THEN NOW() ELSE terms_agreed_at END,
    privacy_agreed_at = CASE WHEN p_privacy_agreed THEN NOW() ELSE privacy_agreed_at END,
    marketing_agreed_at = CASE WHEN p_marketing_agreed THEN NOW() ELSE NULL END,
    profile_completed = TRUE,
    updated_at = NOW()
  WHERE auth_id = p_auth_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 함수로 클라이언트에서 호출 가능하게 설정
GRANT EXECUTE ON FUNCTION complete_user_profile TO authenticated;

COMMENT ON FUNCTION complete_user_profile IS '소셜 로그인 후 추가 정보 입력 및 약관 동의 처리';

-- 6. 프로필 완료 여부 체크 함수
CREATE OR REPLACE FUNCTION check_profile_completed(p_auth_id UUID)
RETURNS TABLE (
  is_completed BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  v_user RECORD;
  v_missing TEXT[] := '{}';
BEGIN
  SELECT * INTO v_user FROM public.users WHERE auth_id = p_auth_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY['user_not_found']::TEXT[];
    RETURN;
  END IF;
  
  -- 누락된 필드 체크
  IF v_user.name IS NULL OR v_user.name = '' OR v_user.name = '사용자' THEN
    v_missing := array_append(v_missing, 'name');
  END IF;
  
  IF v_user.phone IS NULL OR v_user.phone = '' THEN
    v_missing := array_append(v_missing, 'phone');
  END IF;
  
  IF v_user.terms_agreed_at IS NULL THEN
    v_missing := array_append(v_missing, 'terms');
  END IF;
  
  IF v_user.privacy_agreed_at IS NULL THEN
    v_missing := array_append(v_missing, 'privacy');
  END IF;
  
  RETURN QUERY SELECT 
    (array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0),
    v_missing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_profile_completed TO authenticated;

COMMENT ON FUNCTION check_profile_completed IS '사용자 프로필 완료 여부 및 누락 필드 확인';

