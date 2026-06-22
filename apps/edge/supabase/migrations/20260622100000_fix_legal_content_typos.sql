-- 이용약관·환불정책 오타 수정 (PG 심사 대응)
-- fix_policy_review_issues 마이그레이션에서 유입된 오타 정정

-- 1. 이용약관: 오타 일괄 수정 + 제15조 중복 문구 제거
UPDATE public.app_contents
SET
  content = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          content,
          '리셀러 시세, 프리미엄 가격, 한정판 휘소성 등에 의한 부가가치(시세차익)는 보상 산정 기준에서 제외됩니다.
   리셀러 시세, 프리미엄 가격, 한정판 휘소성 등에 의한 부가가치(시세차익)는 보상 산정 기준에서 제외됩니다.',
          '리셀러 시세, 프리미엄 가격, 한정판 희소성 등에 의한 부가가치(시세차익)는 보상 산정 기준에서 제외됩니다.'
        ),
        '귀체사유',
        '귀책사유'
      ),
      '의룰',
      '의뢰'
    ),
    '휘소성',
    '희소성'
  ),
  updated_at = NOW()
WHERE key = 'terms_of_service';

-- 2. 환불정책: 오타 일괄 수정
UPDATE public.app_contents
SET
  content = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(content, '귀체사유', '귀책사유'),
                '귀체로',
                '귀책으로'
              ),
              '귀체에',
              '귀책에'
            ),
            '의룰',
            '의뢰'
          ),
          '휘소성',
          '희소성'
        ),
        '실것',
        '실제'
      ),
      '실협',
      '실제'
    ),
    '체임지고',
    '책임지고'
  ),
  updated_at = NOW()
WHERE key = 'refund_policy';
