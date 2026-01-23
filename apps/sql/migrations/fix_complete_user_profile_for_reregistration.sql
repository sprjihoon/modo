-- =====================================================
-- 소셜 로그인 재가입 시 프로필 생성 오류 수정
-- =====================================================
-- 문제: 탈퇴 후 동일 이메일로 재가입 시 user_not_found 에러
-- 원인: complete_user_profile이 UPDATE만 수행, INSERT 미처리
-- 해결: INSERT/UPDATE 분기 처리

CREATE OR REPLACE FUNCTION complete_user_profile(
  p_auth_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_terms_agreed BOOLEAN DEFAULT TRUE,
  p_privacy_agreed BOOLEAN DEFAULT TRUE,
  p_marketing_agreed BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_exists BOOLEAN;
  v_email TEXT;
BEGIN
  -- 사용자 존재 여부 확인
  SELECT EXISTS(SELECT 1 FROM public.users WHERE auth_id = p_auth_id) INTO v_user_exists;
  
  -- auth.users에서 이메일 가져오기
  SELECT email INTO v_email FROM auth.users WHERE id = p_auth_id;
  
  IF v_user_exists THEN
    -- 기존 사용자: UPDATE
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
  ELSE
    -- 신규 사용자 (재가입 포함): INSERT
    INSERT INTO public.users (
      auth_id,
      email,
      name,
      phone,
      role,
      terms_agreed_at,
      privacy_agreed_at,
      marketing_agreed_at,
      profile_completed
    ) VALUES (
      p_auth_id,
      v_email,
      p_name,
      p_phone,
      'CUSTOMER',
      CASE WHEN p_terms_agreed THEN NOW() ELSE NULL END,
      CASE WHEN p_privacy_agreed THEN NOW() ELSE NULL END,
      CASE WHEN p_marketing_agreed THEN NOW() ELSE NULL END,
      TRUE
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'complete_user_profile error: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION complete_user_profile TO authenticated;

COMMENT ON FUNCTION complete_user_profile IS '소셜 로그인 후 추가 정보 입력 및 약관 동의 처리 (재가입 지원)';

