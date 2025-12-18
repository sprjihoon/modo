-- ============================================
-- Add images column to app_contents table
-- ============================================
-- 작성일: 2025-12-18
-- 설명: app_contents 테이블에 images 컬럼 추가 (이미지 URL 배열 저장)

-- images 컬럼이 없으면 추가
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'app_contents' 
    and column_name = 'images'
  ) then
    alter table app_contents add column images jsonb default '[]'::jsonb;
    raise notice '✅ images 컬럼 추가 완료';
  else
    raise notice 'ℹ️  images 컬럼이 이미 존재합니다';
  end if;
end $$;

-- 완료 메시지
do $$ 
begin
  raise notice '✅ app_contents 테이블 images 컬럼 확인 완료';
end $$;

