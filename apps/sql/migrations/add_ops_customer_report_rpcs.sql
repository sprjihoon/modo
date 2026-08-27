-- 운영 리포트: 활성 고객(30일 결제) · 그날 로그인 수

CREATE OR REPLACE FUNCTION public.count_active_customers(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::INTEGER
  FROM public.orders
  WHERE user_id IS NOT NULL
    AND payment_status = 'PAID'
    AND canceled_at IS NULL
    AND created_at >= p_start
    AND created_at <= p_end;
$$;

CREATE OR REPLACE FUNCTION public.count_customer_signins(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::INTEGER
  FROM auth.users a
  INNER JOIN public.users u ON u.auth_id = a.id
  WHERE COALESCE(u.role::text, 'CUSTOMER') = 'CUSTOMER'
    AND u.email NOT LIKE 'deleted_%'
    AND a.last_sign_in_at IS NOT NULL
    AND a.last_sign_in_at >= p_start
    AND a.last_sign_in_at <= p_end;
$$;

GRANT EXECUTE ON FUNCTION public.count_active_customers(TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.count_customer_signins(TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
