-- ============================================
-- Fix app_contents RLS policy for admin access
-- ============================================
-- 작성일: 2025-12-18
-- 설명: admin@modorepair.com 사용자가 app_contents에 접근할 수 있도록 RLS 정책 수정

-- 기존 정책 삭제
drop policy if exists "Allow admin full access" on app_contents;

-- 새로운 정책 생성 (role 기반 또는 이메일 기반)
create policy "Allow admin full access" on app_contents
  for all using (
    exists (
      select 1 from users
      where auth_id = auth.uid()
      and (
        role in ('ADMIN', 'MANAGER')
        or email like '%@admin.modorepair.com'
        or email = 'admin@modorepair.com'
      )
    )
  );

-- 완료 메시지
do $$ 
begin
  raise notice '✅ app_contents RLS 정책 수정 완료';
  raise notice '   - admin@modorepair.com 사용자 접근 허용';
  raise notice '   - ADMIN, MANAGER role 사용자 접근 허용';
end $$;

