-- 미션 쿠폰 사용기한은 발급 시점부터 N일. 미션에 고정된 valid_until은 쓰지 않는다.

CREATE OR REPLACE FUNCTION public.try_issue_invite_milestone_coupons(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite INTEGER;
  v_orders INTEGER;
  v_reviews INTEGER;
  v_rule public.invite_coupon_milestones%ROWTYPE;
  v_need_any BOOLEAN;
  v_ok BOOLEAN;
  v_desc TEXT;
BEGIN
  SELECT p.invite_count, p.paid_orders, p.photo_reviews
    INTO v_invite, v_orders, v_reviews
  FROM public.coupon_mission_progress(p_user_id) p;

  FOR v_rule IN
    SELECT * FROM public.invite_coupon_milestones WHERE is_active = true
  LOOP
    v_need_any := COALESCE(v_rule.threshold, 0) > 0
      OR COALESCE(v_rule.min_paid_orders, 0) > 0
      OR COALESCE(v_rule.min_photo_reviews, 0) > 0;
    IF NOT v_need_any THEN
      CONTINUE;
    END IF;

    v_ok := true;
    IF COALESCE(v_rule.threshold, 0) > 0 AND v_invite < v_rule.threshold THEN
      v_ok := false;
    END IF;
    IF COALESCE(v_rule.min_paid_orders, 0) > 0 AND v_orders < v_rule.min_paid_orders THEN
      v_ok := false;
    END IF;
    IF COALESCE(v_rule.min_photo_reviews, 0) > 0 AND v_reviews < v_rule.min_photo_reviews THEN
      v_ok := false;
    END IF;
    IF NOT v_ok THEN
      CONTINUE;
    END IF;

    v_desc := '미션 보상';
    IF COALESCE(v_rule.threshold, 0) > 0 THEN
      v_desc := v_desc || ' · 초대 ' || v_rule.threshold::text || '명';
    END IF;
    IF COALESCE(v_rule.min_paid_orders, 0) > 0 THEN
      v_desc := v_desc || ' · 수선 ' || v_rule.min_paid_orders::text || '회';
    END IF;
    IF COALESCE(v_rule.min_photo_reviews, 0) > 0 THEN
      v_desc := v_desc || ' · 포토리뷰 ' || v_rule.min_photo_reviews::text || '회';
    END IF;

    PERFORM public.issue_exclusive_promotion_code(
      p_user_id,
      'invite_milestone',
      v_rule.discount_type::text,
      v_rule.discount_value,
      GREATEST(COALESCE(v_rule.valid_days, 30), 1),
      v_rule.min_order_amount,
      v_rule.max_discount_amount,
      NULL,
      NULL,
      NULLIF(v_rule.threshold, 0),
      COALESCE(v_rule.description, v_desc),
      v_rule.id,
      NULL
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_issue_invite_milestone_coupons(UUID) TO service_role;
