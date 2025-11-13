-- ============================================
-- 빠른 해결: 이메일 확인 SQL
-- ============================================
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 방법 1: 특정 이메일만 확인
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'vovok@naver.com';
-- ✅ vovok@naver.com 이메일 확인 처리

-- 방법 2: 모든 사용자의 이메일 확인 (개발용)
-- UPDATE auth.users 
-- SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
-- WHERE email_confirmed_at IS NULL;

-- 방법 3: 특정 사용자 ID로 확인
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE id = 'user-uuid-here';

-- ============================================
-- 확인 방법: 실행 후 아래 쿼리로 확인
-- ============================================
-- SELECT email, email_confirmed_at, created_at 
-- FROM auth.users 
-- ORDER BY created_at DESC 
-- LIMIT 10;

