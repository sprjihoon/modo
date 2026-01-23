-- ============================================
-- 보안 수정 검증 SQL
-- 실행하여 오류가 없는지 확인
-- ============================================

-- =============================================
-- Part 1: RLS 활성화 상태 확인
-- =============================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('addresses', 'promotion_codes', 'promotion_code_usages')
ORDER BY tablename;

-- 예상 결과: 모든 테이블의 rls_enabled가 true

-- =============================================
-- Part 2: RLS 정책 존재 여부 확인
-- =============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('addresses', 'promotion_codes', 'promotion_code_usages')
ORDER BY tablename, policyname;

-- 예상 결과: 각 테이블에 정책들이 존재해야 함

-- =============================================
-- Part 3: 뷰 Security Invoker 상태 확인
-- =============================================

SELECT 
  n.nspname as schema_name,
  c.relname as view_name,
  CASE 
    WHEN c.reloptions IS NULL THEN false
    WHEN 'security_invoker=true' = ANY(c.reloptions) THEN true
    ELSE false
  END as security_invoker
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND c.relname IN (
    'customer_session_summary',
    'session_metrics_daily',
    'hourly_activity_pattern',
    'daily_performance',
    'device_performance',
    'app_version_performance',
    'customer_segment_analysis',
    'page_performance',
    'customer_cohorts',
    'cohort_retention_daily',
    'cohort_retention_weekly',
    'cohort_performance',
    'n_day_retention',
    'unbounded_retention',
    'purchase_retention',
    'event_sequences',
    'conversion_paths',
    'page_flow',
    'dropout_paths'
  )
ORDER BY view_name;

-- 예상 결과: 모든 뷰의 security_invoker가 true

-- =============================================
-- Part 4: 뷰 조회 테스트 (관리자로 실행)
-- =============================================

-- 에러 없이 조회되면 성공
SELECT COUNT(*) as session_count FROM session_metrics_daily LIMIT 1;
SELECT COUNT(*) as cohort_count FROM cohort_retention_daily LIMIT 1;
SELECT COUNT(*) as retention_count FROM n_day_retention LIMIT 1;

-- =============================================
-- Part 5: 테이블 조회 테스트
-- =============================================

-- 에러 없이 조회되면 성공
SELECT COUNT(*) as address_count FROM addresses;
SELECT COUNT(*) as promo_count FROM promotion_codes;
SELECT COUNT(*) as usage_count FROM promotion_code_usages;

-- =============================================
-- Part 6: 결과 요약
-- =============================================

DO $$
DECLARE
  v_rls_ok BOOLEAN := true;
  v_view_ok BOOLEAN := true;
  v_count INT;
BEGIN
  -- RLS 확인
  SELECT COUNT(*) INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('addresses', 'promotion_codes', 'promotion_code_usages')
    AND rowsecurity = true;
  
  IF v_count != 3 THEN
    v_rls_ok := false;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔍 보안 수정 검증 결과';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF v_rls_ok THEN
    RAISE NOTICE '✅ RLS 활성화: 정상 (3/3 테이블)';
  ELSE
    RAISE NOTICE '❌ RLS 활성화: 실패 (%/3 테이블)', v_count;
  END IF;
  
  RAISE NOTICE '✅ Security Invoker 뷰: 위 쿼리 결과 확인 필요';
  RAISE NOTICE '';
  RAISE NOTICE '📋 체크 항목:';
  RAISE NOTICE '   1. Part 1 결과에서 모든 rls_enabled가 true인지 확인';
  RAISE NOTICE '   2. Part 2 결과에서 정책들이 존재하는지 확인';
  RAISE NOTICE '   3. Part 3 결과에서 security_invoker가 true인지 확인';
  RAISE NOTICE '   4. Part 4-5에서 에러 없이 조회되는지 확인';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

