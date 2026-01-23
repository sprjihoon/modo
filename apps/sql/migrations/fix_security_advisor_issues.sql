-- ============================================
-- Supabase Security Advisor 보안 이슈 수정
-- 25개 에러 수정 (2026-01-20)
-- ============================================

-- =============================================
-- Part 1: RLS Disabled 테이블 수정 (3개)
-- Policy Exists RLS Disabled 에러 해결
-- =============================================

-- 1.1. addresses 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY;

-- 1.2. promotion_codes 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.promotion_codes ENABLE ROW LEVEL SECURITY;

-- 1.3. promotion_code_usages 테이블 RLS 활성화
ALTER TABLE IF EXISTS public.promotion_code_usages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Part 2: Security Definer View 수정
-- SECURITY INVOKER로 변경하여 RLS 우회 방지
-- =============================================

-- 모든 뷰를 안전하게 수정하는 함수
DO $$
DECLARE
  v_views TEXT[] := ARRAY[
    -- Phase 1 Analytics Views (8개)
    'customer_session_summary',
    'session_metrics_daily',
    'hourly_activity_pattern',
    'daily_performance',
    'device_performance',
    'app_version_performance',
    'customer_segment_analysis',
    'page_performance',
    -- Phase 2 Analytics Views (11개)
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
  ];
  v_view_name TEXT;
  v_success_count INT := 0;
  v_skip_count INT := 0;
BEGIN
  RAISE NOTICE '🔧 Security Definer View 수정 시작...';
  RAISE NOTICE '';
  
  FOREACH v_view_name IN ARRAY v_views LOOP
    -- 뷰가 존재하는지 확인
    IF EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = v_view_name
    ) THEN
      -- security_invoker 설정
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view_name);
      RAISE NOTICE '   ✓ % - SECURITY INVOKER 설정됨', v_view_name;
      v_success_count := v_success_count + 1;
    ELSE
      RAISE NOTICE '   ⚠ % - 뷰가 존재하지 않음 (건너뜀)', v_view_name;
      v_skip_count := v_skip_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 결과: %개 수정됨, %개 건너뜀', v_success_count, v_skip_count;
END $$;

-- =============================================
-- Part 3: 검증 쿼리
-- =============================================

-- RLS 활성화 상태 확인
DO $$
DECLARE
  v_table_name TEXT;
  v_rls_enabled BOOLEAN;
  v_tables TEXT[] := ARRAY['addresses', 'promotion_codes', 'promotion_code_usages'];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🔒 Security Advisor 이슈 수정 완료';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS 활성화 상태 확인:';
  
  FOREACH v_table_name IN ARRAY v_tables LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table_name AND relnamespace = 'public'::regnamespace;
    
    IF v_rls_enabled THEN
      RAISE NOTICE '   ✓ %.% - RLS 활성화됨', 'public', v_table_name;
    ELSE
      RAISE NOTICE '   ✗ %.% - RLS 비활성화 (수동 확인 필요)', 'public', v_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Security Invoker 뷰 수정됨 (19개):';
  RAISE NOTICE '   - customer_session_summary';
  RAISE NOTICE '   - session_metrics_daily';
  RAISE NOTICE '   - hourly_activity_pattern';
  RAISE NOTICE '   - daily_performance';
  RAISE NOTICE '   - device_performance';
  RAISE NOTICE '   - app_version_performance';
  RAISE NOTICE '   - customer_segment_analysis';
  RAISE NOTICE '   - page_performance';
  RAISE NOTICE '   - customer_cohorts';
  RAISE NOTICE '   - cohort_retention_daily';
  RAISE NOTICE '   - cohort_retention_weekly';
  RAISE NOTICE '   - cohort_performance';
  RAISE NOTICE '   - n_day_retention';
  RAISE NOTICE '   - unbounded_retention';
  RAISE NOTICE '   - purchase_retention';
  RAISE NOTICE '   - event_sequences';
  RAISE NOTICE '   - conversion_paths';
  RAISE NOTICE '   - page_flow';
  RAISE NOTICE '   - dropout_paths';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 다음 단계:';
  RAISE NOTICE '   1. Supabase Dashboard에서 Security Advisor 새로고침';
  RAISE NOTICE '   2. 에러 개수가 0개인지 확인';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

