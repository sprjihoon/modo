-- ============================================
-- 4개 이상 영상 테스트 데이터 삽입
-- 송장번호: 60126011580813에 입고/출고 영상 각 5개씩 추가
-- ============================================

-- 기존 테스트 데이터 삭제 (해당 송장번호의 영상만)
DELETE FROM public.media WHERE final_waybill_no = '60126011580813';

-- 입고 영상 5개 삽입
INSERT INTO public.media (final_waybill_no, type, provider, path, sequence) VALUES
('60126011580813', 'inbound_video', 'cloudflare', 'test_video_inbound_1', 1),
('60126011580813', 'inbound_video', 'cloudflare', 'test_video_inbound_2', 2),
('60126011580813', 'inbound_video', 'cloudflare', 'test_video_inbound_3', 3),
('60126011580813', 'inbound_video', 'cloudflare', 'test_video_inbound_4', 4),
('60126011580813', 'inbound_video', 'cloudflare', 'test_video_inbound_5', 5);

-- 출고 영상 5개 삽입
INSERT INTO public.media (final_waybill_no, type, provider, path, sequence) VALUES
('60126011580813', 'outbound_video', 'cloudflare', 'test_video_outbound_1', 1),
('60126011580813', 'outbound_video', 'cloudflare', 'test_video_outbound_2', 2),
('60126011580813', 'outbound_video', 'cloudflare', 'test_video_outbound_3', 3),
('60126011580813', 'outbound_video', 'cloudflare', 'test_video_outbound_4', 4),
('60126011580813', 'outbound_video', 'cloudflare', 'test_video_outbound_5', 5);

-- 확인 쿼리
SELECT 
  type,
  COUNT(*) as count,
  array_agg(sequence ORDER BY sequence) as sequences
FROM public.media 
WHERE final_waybill_no = '60126011580813'
GROUP BY type
ORDER BY type;

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE '✅ 테스트 데이터 삽입 완료!';
  RAISE NOTICE '📹 입고 영상 5개, 출고 영상 5개 (송장번호: 60126011580813)';
END $$;

