-- ============================================
-- 통합 알림 시스템 테스트 스크립트
-- ============================================
-- 
-- 이 스크립트는 통합 알림 시스템을 테스트하기 위한 것입니다.
-- 실제 데이터를 생성하여 앱에서 확인할 수 있습니다.
-- 
-- 사용법:
-- 1. 본인의 user_id를 아래 변수에 설정
-- 2. Supabase SQL Editor에서 실행
-- 3. 앱에서 알림 아이콘을 눌러 확인

-- ============================================
-- 1. 설정: 본인의 user_id 입력
-- ============================================
DO $$
DECLARE
  -- 🔧 여기에 본인의 user_id (UUID) 입력
  v_test_user_id UUID := 'YOUR_USER_ID_HERE';
  
  -- 테스트용 주문 ID (있으면 입력, 없으면 NULL)
  v_test_order_id UUID := NULL;
  v_test_order_number TEXT := 'ORD-TEST-001';
BEGIN
  -- ============================================
  -- 2. 주문 ID 확인 (자동)
  -- ============================================
  SELECT id, order_number INTO v_test_order_id, v_test_order_number
  FROM public.orders
  WHERE user_id = v_test_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_test_order_id IS NULL THEN
    RAISE NOTICE '⚠️ 주문이 없습니다. 주문 관련 알림은 생성되지 않습니다.';
  ELSE
    RAISE NOTICE '✅ 테스트 주문: % (%)', v_test_order_number, v_test_order_id;
  END IF;

  -- ============================================
  -- 3. 테스트 알림 생성
  -- ============================================
  RAISE NOTICE '📱 테스트 알림 생성 시작...';

  -- 3-1. 추가 결제 요청 알림
  IF v_test_order_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      body,
      read,
      created_at
    ) VALUES (
      v_test_user_id,
      v_test_order_id,
      'ADDITIONAL_PAYMENT_REQUESTED',
      '💳 추가 결제 요청',
      '주문(' || v_test_order_number || ')에 추가 작업이 필요합니다. 추가 금액: 15,000원',
      false,
      NOW()
    );
    RAISE NOTICE '✅ 추가 결제 알림 생성';
  END IF;

  -- 3-2. 주문 상태 변경 알림 (입고 완료)
  IF v_test_order_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      body,
      read,
      created_at
    ) VALUES (
      v_test_user_id,
      v_test_order_id,
      'ORDER_STATUS_CHANGED',
      '📦 입고 완료',
      '주문(' || v_test_order_number || ')이 입고되었습니다. 곧 수선을 시작합니다.',
      false,
      NOW() - INTERVAL '1 hour'
    );
    RAISE NOTICE '✅ 주문 상태 알림 생성 (입고 완료)';
  END IF;

  -- 3-3. 주문 상태 변경 알림 (수선 중)
  IF v_test_order_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      body,
      read,
      created_at
    ) VALUES (
      v_test_user_id,
      v_test_order_id,
      'ORDER_STATUS_CHANGED',
      '🔨 수선 중',
      '주문(' || v_test_order_number || ')의 수선 작업이 시작되었습니다.',
      true,
      NOW() - INTERVAL '2 hours'
    );
    RAISE NOTICE '✅ 주문 상태 알림 생성 (수선 중, 읽음)';
  END IF;

  -- 3-4. 프로모션 알림
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    read,
    created_at
  ) VALUES (
    v_test_user_id,
    'PROMOTION',
    '🎉 특별 할인 이벤트',
    '이번 주 한정! 수선비 10% 할인 쿠폰이 발급되었습니다.',
    false,
    NOW() - INTERVAL '3 hours'
  );
  RAISE NOTICE '✅ 프로모션 알림 생성';

  -- 3-5. 시스템 알림
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    read,
    created_at
  ) VALUES (
    v_test_user_id,
    'SYSTEM',
    '📢 앱 업데이트 안내',
    '새로운 기능이 추가되었습니다. 앱을 업데이트해 주세요.',
    false,
    NOW() - INTERVAL '1 day'
  );
  RAISE NOTICE '✅ 시스템 알림 생성';

  -- ============================================
  -- 4. 테스트 공지사항 생성
  -- ============================================
  RAISE NOTICE '📢 테스트 공지사항 생성 시작...';

  -- 4-1. 긴급 공지 (고정)
  INSERT INTO public.announcements (
    type,
    title,
    content,
    is_pinned,
    status,
    sent_at,
    created_at
  ) VALUES (
    'urgent',
    '🚨 긴급 공지: 시스템 점검 안내',
    '2025년 1월 1일 00:00 ~ 04:00까지 시스템 점검이 예정되어 있습니다. 해당 시간에는 서비스 이용이 제한될 수 있습니다.',
    true,
    'sent',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  );
  RAISE NOTICE '✅ 긴급 공지 생성 (고정)';

  -- 4-2. 프로모션 공지
  INSERT INTO public.announcements (
    type,
    title,
    content,
    is_pinned,
    status,
    sent_at,
    created_at
  ) VALUES (
    'promotion',
    '🎉 신년 맞이 특별 이벤트',
    '새해를 맞이하여 모든 수선 서비스 20% 할인! 1월 31일까지 진행됩니다.',
    false,
    'sent',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  );
  RAISE NOTICE '✅ 프로모션 공지 생성';

  -- 4-3. 일반 공지
  INSERT INTO public.announcements (
    type,
    title,
    content,
    is_pinned,
    status,
    sent_at,
    created_at
  ) VALUES (
    'general',
    '📢 서비스 이용 안내',
    '더 나은 서비스를 제공하기 위해 노력하고 있습니다. 문의사항이 있으시면 고객센터로 연락해 주세요.',
    false,
    'sent',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
  );
  RAISE NOTICE '✅ 일반 공지 생성';

  -- ============================================
  -- 5. 완료 메시지
  -- ============================================
  RAISE NOTICE '
======================================
✅ 테스트 데이터 생성 완료!
======================================

📱 앱에서 확인하기:
1. 홈 화면 우측 상단 알림 아이콘(🔔) 클릭
2. "내 알림" 탭: 개인 알림 확인
3. "공지사항" 탭: 공지사항 확인

📊 생성된 데이터:
- 알림: 5개 (읽지 않음: 4개)
- 공지사항: 3개

🧹 데이터 정리 (필요 시):
-- 테스트 알림 삭제
DELETE FROM public.notifications 
WHERE user_id = ''%'' 
AND created_at > NOW() - INTERVAL ''1 day'';

-- 테스트 공지사항 삭제
DELETE FROM public.announcements 
WHERE created_at > NOW() - INTERVAL ''1 day'';
======================================
  ', v_test_user_id;

END $$;

-- ============================================
-- 부록: 유용한 쿼리
-- ============================================

-- 본인의 user_id 찾기
-- SELECT id, email, name FROM public.users WHERE email = 'your-email@example.com';

-- 본인의 알림 조회
-- SELECT * FROM public.notifications WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC;

-- 본인의 최근 주문 조회
-- SELECT id, order_number, status FROM public.orders WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 5;

-- 읽지 않은 알림 개수
-- SELECT COUNT(*) FROM public.notifications WHERE user_id = 'YOUR_USER_ID' AND read = false;

