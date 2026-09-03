-- 프로모/쿠폰에 왕복 기본 배송비 면제 플래그.
-- ON이면 수선 할인에 더해 왕복 배송비를 0원. 도서산간 추가비는 유지.

ALTER TABLE public.promotion_codes
  ADD COLUMN IF NOT EXISTS includes_free_shipping BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.promotion_codes.includes_free_shipping IS
  'true면 수선 할인에 더해 왕복 기본 배송비를 면제. 도서산간 추가비는 유지.';

ALTER TABLE public.invite_coupon_milestones
  ADD COLUMN IF NOT EXISTS includes_free_shipping BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invite_coupon_milestones.includes_free_shipping IS
  '미션으로 발급되는 전용 쿠폰에 왕복 배송비 면제를 넣을지.';

DROP FUNCTION IF EXISTS public.issue_exclusive_promotion_code(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, TEXT, INTEGER, TEXT, UUID, TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.issue_exclusive_promotion_code(
  p_user_id UUID,
  p_source TEXT,
  p_discount_type TEXT,
  p_discount_value INTEGER,
  p_valid_days INTEGER DEFAULT 30,
  p_min_order_amount INTEGER DEFAULT 0,
  p_max_discount_amount INTEGER DEFAULT NULL,
  p_issued_by UUID DEFAULT NULL,
  p_issued_note TEXT DEFAULT NULL,
  p_milestone_threshold INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_milestone_id UUID DEFAULT NULL,
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_includes_free_shipping BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_try INT := 0;
  v_id UUID;
  v_until TIMESTAMPTZ;
  v_dtype public.discount_type;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_required');
  END IF;
  IF p_source NOT IN ('cs', 'invite_milestone') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_source');
  END IF;
  IF p_discount_value IS NULL OR p_discount_value <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_discount');
  END IF;

  v_dtype := p_discount_type::public.discount_type;
  IF v_dtype = 'PERCENTAGE' AND p_discount_value > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_percent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  v_until := CASE
    WHEN p_valid_until IS NOT NULL THEN p_valid_until
    WHEN p_valid_days IS NULL OR p_valid_days <= 0 THEN NULL
    ELSE NOW() + make_interval(days => p_valid_days)
  END;

  LOOP
    v_try := v_try + 1;
    IF p_source = 'invite_milestone' THEN
      v_code := 'INV' || COALESCE(p_milestone_threshold, 0)::text
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    ELSE
      v_code := 'CS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    END IF;

    BEGIN
      INSERT INTO public.promotion_codes (
        code, discount_type, discount_value, max_uses, used_count,
        max_uses_per_user, min_order_amount, max_discount_amount,
        valid_from, valid_until, description, is_active,
        assigned_user_id, source, issued_by, issued_note, milestone_threshold, milestone_id,
        includes_free_shipping
      ) VALUES (
        v_code, v_dtype, p_discount_value, 1, 0,
        1, COALESCE(p_min_order_amount, 0), p_max_discount_amount,
        NOW(), v_until,
        COALESCE(p_description, CASE
          WHEN p_source = 'invite_milestone' THEN '미션 보상 쿠폰'
          ELSE 'CS 전용 쿠폰'
        END),
        true,
        p_user_id, p_source, p_issued_by, p_issued_note, p_milestone_threshold, p_milestone_id,
        COALESCE(p_includes_free_shipping, false)
      )
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF SQLERRM LIKE '%idx_promotion_codes_user_milestone%' THEN
          RETURN jsonb_build_object('ok', false, 'error', 'already_issued');
        END IF;
        IF v_try >= 8 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'code_collision');
        END IF;
    END;
  END LOOP;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      p_user_id,
      'promotion',
      '전용 쿠폰이 지급되었습니다',
      '쿠폰 코드 ' || v_code || ' 를 수거신청에서 사용할 수 있어요.'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
END;
$$;

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
      NULL,
      COALESCE(v_rule.includes_free_shipping, false)
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_exclusive_promotion_code(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, TEXT, INTEGER, TEXT, UUID, TIMESTAMPTZ, BOOLEAN
) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_issue_invite_milestone_coupons(UUID) TO service_role;
