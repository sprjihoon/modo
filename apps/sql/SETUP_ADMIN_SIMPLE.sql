-- ============================================
-- 슈퍼관리자 계정 자동 설정 (간단 버전)
-- ============================================
-- 사용법:
-- 1. Supabase Dashboard > Authentication > Users에서 계정 생성
--    이메일: admin@modorepair.com (또는 원하는 이메일)
--    비밀번호: 강력한 비밀번호 입력
--    Auto Confirm User: ✅ 체크
-- 2. 아래 SQL 실행 (이메일만 수정)
-- ============================================

DO $$
DECLARE
  v_admin_email TEXT := 'admin@modorepair.com';  -- 👈 여기만 수정하세요!
  v_auth_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- 1. auth.users에서 auth_id 찾기
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_admin_email;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION '❌ 이메일 "%"을(를) 찾을 수 없습니다. Supabase Dashboard > Authentication > Users에서 먼저 계정을 생성해주세요.', v_admin_email;
  END IF;

  RAISE NOTICE '✅ Auth 계정 발견: % (ID: %)', v_admin_email, v_auth_id;

  -- 2. public.users에 프로필이 있는지 확인
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE auth_id = v_auth_id
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- 이미 존재하면 ADMIN으로 업데이트
    UPDATE public.users 
    SET 
      role = 'ADMIN',
      updated_at = NOW()
    WHERE auth_id = v_auth_id;
    
    RAISE NOTICE '✅ 기존 프로필을 ADMIN으로 업데이트했습니다.';
  ELSE
    -- 없으면 새로 생성
    INSERT INTO public.users (
      auth_id,
      email,
      name,
      phone,
      role,
      created_at,
      updated_at
    )
    VALUES (
      v_auth_id,
      v_admin_email,
      '최고관리자',
      '010-0000-0000',
      'ADMIN',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ ADMIN 프로필을 생성했습니다.';
  END IF;

  -- 3. 결과 확인
  RAISE NOTICE '';
  RAISE NOTICE '🎉 슈퍼관리자 계정 설정 완료!';
  RAISE NOTICE '   이메일: %', v_admin_email;
  RAISE NOTICE '   역할: ADMIN';
  RAISE NOTICE '';
  RAISE NOTICE '👉 이제 로그인하세요: http://localhost:3000/login';
  
END $$;

-- 확인: ADMIN 계정 조회
SELECT 
  u.email,
  u.name,
  u.role,
  a.email_confirmed_at AS 이메일확인,
  u.created_at AS 생성일
FROM public.users u
JOIN auth.users a ON u.auth_id = a.id
WHERE u.role = 'ADMIN';

