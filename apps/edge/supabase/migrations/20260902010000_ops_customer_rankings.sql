-- 운영 리포트: 기간별 고객 순위 (친구추천 · 매출 · 접속 · 주문)

CREATE OR REPLACE FUNCTION public.ops_customer_rankings(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
  v_result JSONB;
BEGIN
  WITH referrers AS (
    SELECT
      u.invited_by AS user_id,
      COUNT(*)::INTEGER AS value,
      0 AS extra
    FROM public.users u
    WHERE u.invited_by IS NOT NULL
      AND COALESCE(u.role::text, 'CUSTOMER') = 'CUSTOMER'
      AND u.email NOT LIKE 'deleted_%'
      AND u.created_at >= p_start
      AND u.created_at <= p_end
    GROUP BY u.invited_by
    ORDER BY value DESC
    LIMIT v_limit
  ),
  paid AS (
    SELECT
      o.user_id,
      SUM(COALESCE(o.total_price, 0)) AS revenue,
      COUNT(*)::INTEGER AS orders
    FROM public.orders o
    WHERE o.user_id IS NOT NULL
      AND o.payment_status = 'PAID'
      AND o.status NOT IN ('CANCELLED', 'RETURN_PENDING', 'RETURN_SHIPPING', 'RETURN_DONE')
      AND o.created_at >= p_start
      AND o.created_at <= p_end
    GROUP BY o.user_id
  ),
  visitors AS (
    SELECT
      e.user_id,
      COUNT(DISTINCT COALESCE(e.session_id, e.event_id::text))::INTEGER AS sessions,
      COUNT(*)::INTEGER AS events
    FROM public.customer_events e
    WHERE e.user_id IS NOT NULL
      AND e.event_type IN ('PAGE_VIEW', 'APP_OPEN')
      AND e.created_at >= p_start
      AND e.created_at <= p_end
    GROUP BY e.user_id
    ORDER BY sessions DESC, events DESC
    LIMIT v_limit
  ),
  labeled AS (
    SELECT 'referrer'::text AS kind, r.user_id, r.value::numeric AS value, r.extra::numeric AS extra
    FROM referrers r
    UNION ALL
    SELECT 'revenue', p.user_id, p.revenue, p.orders
    FROM (
      SELECT * FROM paid ORDER BY revenue DESC, orders DESC LIMIT v_limit
    ) p
    UNION ALL
    SELECT 'orders', p.user_id, p.orders, p.revenue
    FROM (
      SELECT * FROM paid ORDER BY orders DESC, revenue DESC LIMIT v_limit
    ) p
    UNION ALL
    SELECT 'visitor', v.user_id, v.sessions, v.events
    FROM visitors v
  )
  SELECT jsonb_build_object(
    'topReferrers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'userId', u.id,
          'name', COALESCE(NULLIF(btrim(u.name), ''), '이름 없음'),
          'email', u.email,
          'value', l.value,
          'extra', l.extra
        )
        ORDER BY l.value DESC, l.extra DESC
      )
      FROM labeled l
      JOIN public.users u ON u.id = l.user_id
      WHERE l.kind = 'referrer'
        AND u.email NOT LIKE 'deleted_%'
    ), '[]'::jsonb),
    'topRevenue', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'userId', u.id,
          'name', COALESCE(NULLIF(btrim(u.name), ''), '이름 없음'),
          'email', u.email,
          'value', l.value,
          'extra', l.extra
        )
        ORDER BY l.value DESC, l.extra DESC
      )
      FROM labeled l
      JOIN public.users u ON u.id = l.user_id
      WHERE l.kind = 'revenue'
        AND u.email NOT LIKE 'deleted_%'
    ), '[]'::jsonb),
    'topVisitors', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'userId', u.id,
          'name', COALESCE(NULLIF(btrim(u.name), ''), '이름 없음'),
          'email', u.email,
          'value', l.value,
          'extra', l.extra
        )
        ORDER BY l.value DESC, l.extra DESC
      )
      FROM labeled l
      JOIN public.users u ON u.id = l.user_id
      WHERE l.kind = 'visitor'
        AND u.email NOT LIKE 'deleted_%'
    ), '[]'::jsonb),
    'topOrders', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'userId', u.id,
          'name', COALESCE(NULLIF(btrim(u.name), ''), '이름 없음'),
          'email', u.email,
          'value', l.value,
          'extra', l.extra
        )
        ORDER BY l.value DESC, l.extra DESC
      )
      FROM labeled l
      JOIN public.users u ON u.id = l.user_id
      WHERE l.kind = 'orders'
        AND u.email NOT LIKE 'deleted_%'
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ops_customer_rankings(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER)
  TO service_role;
