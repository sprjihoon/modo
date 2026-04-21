-- =====================================================
-- 쉬운가이드 구조화(steps) 및 가격표 좀비 데이터 제거
-- =====================================================
-- 변경 사항:
-- 1. app_contents에 metadata JSONB 컬럼 추가
--    - 구조화된 데이터(easy_guide의 steps 등)를 담기 위함
--    - 기존 content/images는 그대로 사용 가능
--
-- 2. easy_guide의 metadata에 단계(steps) 시드
--    - 웹의 하드코딩된 4단계와 동일
--    - 관리자에서 단계 추가/수정/삭제 가능
--
-- 3. price_list 행 제거
--    - 가격표는 repair_types 테이블에서 자동 관리됨
--    - app_contents에 텍스트로 들어있던 데이터는 사용되지 않는 좀비 데이터
--
-- 적용 후:
--   웹  /guide/easy   → app_contents.easy_guide.metadata.steps 에서 동적 로드
--   모바일 쉬운가이드 → 동일 데이터 동기 표시
--   admin /dashboard/settings/contents
--          → 가격표 탭 제거
--          → 쉬운가이드는 단계 편집 UI(이모지/제목/설명)

-- =====================================================
-- 1. metadata 컬럼 추가
-- =====================================================
ALTER TABLE public.app_contents
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.app_contents.metadata IS
  '구조화된 컨텐츠 데이터(예: easy_guide.steps). 키별 자유 형식.';


-- =====================================================
-- 2. easy_guide steps 시드 (웹 STEPS와 동일)
-- =====================================================
UPDATE public.app_contents
SET
  title = '쉬운가이드',
  content = COALESCE(NULLIF(content, ''), '4단계 만에 끝나는 비대면 의류 수선 서비스'),
  metadata = jsonb_build_object(
    'steps',
    jsonb_build_array(
      jsonb_build_object(
        'emoji', '📦',
        'title', '수선 접수',
        'desc',  '앱에서 의류 종류와 수선 항목을 선택하고 수거 신청합니다.'
      ),
      jsonb_build_object(
        'emoji', '🚚',
        'title', '택배 수거',
        'desc',  '지정하신 날짜에 택배 기사님이 의류를 수거합니다.'
      ),
      jsonb_build_object(
        'emoji', '✂️',
        'title', '수선 작업',
        'desc',  '전문 수선사가 꼼꼼하게 수선합니다.'
      ),
      jsonb_build_object(
        'emoji', '📬',
        'title', '배송 완료',
        'desc',  '수선이 완료된 의류를 택배로 배송해드립니다.'
      )
    )
  ),
  updated_at = NOW()
WHERE key = 'easy_guide';

-- easy_guide 행이 없는 경우(신규 환경) 생성
INSERT INTO public.app_contents (key, title, content, metadata)
SELECT
  'easy_guide',
  '쉬운가이드',
  '4단계 만에 끝나는 비대면 의류 수선 서비스',
  jsonb_build_object(
    'steps',
    jsonb_build_array(
      jsonb_build_object('emoji', '📦', 'title', '수선 접수', 'desc', '앱에서 의류 종류와 수선 항목을 선택하고 수거 신청합니다.'),
      jsonb_build_object('emoji', '🚚', 'title', '택배 수거', 'desc', '지정하신 날짜에 택배 기사님이 의류를 수거합니다.'),
      jsonb_build_object('emoji', '✂️', 'title', '수선 작업', 'desc', '전문 수선사가 꼼꼼하게 수선합니다.'),
      jsonb_build_object('emoji', '📬', 'title', '배송 완료', 'desc', '수선이 완료된 의류를 택배로 배송해드립니다.')
    )
  )
WHERE NOT EXISTS (SELECT 1 FROM public.app_contents WHERE key = 'easy_guide');


-- =====================================================
-- 3. price_list 행 제거 (좀비 데이터 정리)
-- =====================================================
-- repair_types 테이블에서 자동 관리되므로 app_contents의 price_list는 불필요
DELETE FROM public.app_contents WHERE key = 'price_list';


-- =====================================================
-- 적용 확인
-- =====================================================
SELECT
  key,
  title,
  CASE WHEN metadata = '{}'::jsonb THEN '(없음)'
       ELSE jsonb_pretty(metadata)
  END AS metadata,
  updated_at
FROM public.app_contents
ORDER BY key;
