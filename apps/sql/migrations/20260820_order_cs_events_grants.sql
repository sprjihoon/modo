-- 고객 웹·앱이 order_cs_events를 조회할 수 있도록 권한 부여
GRANT SELECT ON public.order_cs_events TO anon;
GRANT SELECT ON public.order_cs_events TO authenticated;
