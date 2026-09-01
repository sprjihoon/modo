-- 고객 전용 쿠폰: 할당 컬럼, 초대 마일스톤, SELECT는 공개+본인만

ALTER TABLE public.promotion_codes
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS issued_by UUID,
  ADD COLUMN IF NOT EXISTS issued_note TEXT,
  ADD COLUMN IF NOT EXISTS milestone_threshold INTEGER;

UPDATE public.promotion_codes
SET source = 'public'
WHERE source IS NULL OR btrim(source) = '';

ALTER TABLE public.promotion_codes
  DROP CONSTRAINT IF EXISTS promotion_codes_source_check;

ALTER TABLE public.promotion_codes
  ADD CONSTRAINT promotion_codes_source_check
  CHECK (source IN ('public', 'cs', 'invite_milestone'));

CREATE INDEX IF NOT EXISTS idx_promotion_codes_assigned_user
  ON public.promotion_codes (assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_codes_user_milestone
  ON public.promotion_codes (assigned_user_id, milestone_threshold)
  WHERE assigned_user_id IS NOT NULL AND milestone_threshold IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invite_coupon_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold INTEGER NOT NULL CHECK (threshold > 0),
  discount_type public.discount_type NOT NULL DEFAULT 'FIXED',
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  valid_days INTEGER NOT NULL DEFAULT 30 CHECK (valid_days > 0),
  min_order_amount INTEGER NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount INTEGER,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (threshold)
);

ALTER TABLE public.invite_coupon_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read invite coupon milestones" ON public.invite_coupon_milestones;
CREATE POLICY "Anyone can read invite coupon milestones"
  ON public.invite_coupon_milestones FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.current_public_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.promotion_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.promotion_codes;
DROP POLICY IF EXISTS "Anyone can view active promotion codes" ON public.promotion_codes;
DROP POLICY IF EXISTS "Users can view public or own promotion codes" ON public.promotion_codes;

CREATE POLICY "Users can view public or own promotion codes"
  ON public.promotion_codes
  FOR SELECT
  TO authenticated
  USING (
    assigned_user_id = public.current_public_user_id()
    OR (is_active = true AND assigned_user_id IS NULL)
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
  p_description TEXT DEFAULT NULL
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
        assigned_user_id, source, issued_by, issued_note, milestone_threshold
      ) VALUES (
        v_code, v_dtype, p_discount_value, 1, 0,
        1, COALESCE(p_min_order_amount, 0), p_max_discount_amount,
        NOW(), v_until,
        COALESCE(p_description, CASE
          WHEN p_source = 'invite_milestone'
            THEN '친구 초대 ' || COALESCE(p_milestone_threshold, 0)::text || '명 보상'
          ELSE 'CS 전용 쿠폰'
        END),
        true,
        p_user_id, p_source, p_issued_by, p_issued_note, p_milestone_threshold
      )
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF SQLERRM LIKE '%idx_promotion_codes_user_milestone%'
           OR SQLERRM LIKE '%assigned_user_id, milestone_threshold%' THEN
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
  v_count INTEGER;
  v_rule public.invite_coupon_milestones%ROWTYPE;
BEGIN
  SELECT invite_count INTO v_count FROM public.users WHERE id = p_user_id;
  IF v_count IS NULL THEN
    RETURN;
  END IF;

  FOR v_rule IN
    SELECT * FROM public.invite_coupon_milestones
    WHERE is_active = true AND threshold = v_count
  LOOP
    PERFORM public.issue_exclusive_promotion_code(
      p_user_id,
      'invite_milestone',
      v_rule.discount_type::text,
      v_rule.discount_value,
      v_rule.valid_days,
      v_rule.min_order_amount,
      v_rule.max_discount_amount,
      NULL,
      NULL,
      v_rule.threshold,
      COALESCE(v_rule.description, '친구 초대 ' || v_rule.threshold::text || '명 보상')
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_invite_on_signup(
  p_invitee_user_id UUID,
  p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_invitee public.users%ROWTYPE;
  v_inviter public.users%ROWTYPE;
  v_inviter_amount INTEGER;
  v_invitee_amount INTEGER;
  v_active BOOLEAN;
  v_inviter_tx UUID;
  v_invitee_tx UUID;
BEGIN
  v_code := upper(btrim(COALESCE(p_invite_code, '')));
  IF v_code = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_code');
  END IF;

  SELECT * INTO v_invitee FROM public.users WHERE id = p_invitee_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invitee_not_found');
  END IF;

  IF v_invitee.invited_by IS NOT NULL OR v_invitee.invite_rewarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_applied');
  END IF;

  SELECT * INTO v_inviter
  FROM public.users
  WHERE invite_code IS NOT NULL
    AND upper(invite_code) = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  IF v_inviter.id = v_invitee.id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_invite');
  END IF;

  SELECT invite_reward_amount, invitee_reward_amount, is_active
    INTO v_inviter_amount, v_invitee_amount, v_active
  FROM public.invite_settings
  WHERE id = 1;

  v_inviter_amount := COALESCE(v_inviter_amount, 1000);
  v_invitee_amount := COALESCE(v_invitee_amount, 1000);
  v_active := COALESCE(v_active, TRUE);

  UPDATE public.users
  SET invited_by = v_inviter.id,
      invite_rewarded_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitee.id;

  UPDATE public.users
  SET invite_count = COALESCE(invite_count, 0) + 1,
      updated_at = NOW()
  WHERE id = v_inviter.id;

  IF v_active THEN
    IF v_inviter_amount > 0 THEN
      v_inviter_tx := manage_user_points(
        v_inviter.id,
        v_inviter_amount,
        'EARNED'::point_transaction_type,
        '친구초대 보상 (초대자)',
        NULL,
        NULL,
        NOW() + INTERVAL '30 days'
      );

      UPDATE public.users
      SET invite_points_earned = COALESCE(invite_points_earned, 0) + v_inviter_amount,
          updated_at = NOW()
      WHERE id = v_inviter.id;
    END IF;

    IF v_invitee_amount > 0 THEN
      v_invitee_tx := manage_user_points(
        v_invitee.id,
        v_invitee_amount,
        'EARNED'::point_transaction_type,
        '친구초대 보상 (가입·코드입력)',
        NULL,
        NULL,
        NOW() + INTERVAL '30 days'
      );
    END IF;
  END IF;

  PERFORM public.try_issue_invite_milestone_coupons(v_inviter.id);

  RETURN jsonb_build_object(
    'ok', true,
    'inviter_id', v_inviter.id,
    'inviter_amount', CASE WHEN v_active THEN v_inviter_amount ELSE 0 END,
    'invitee_amount', CASE WHEN v_active THEN v_invitee_amount ELSE 0 END,
    'amount', CASE WHEN v_active THEN v_inviter_amount ELSE 0 END,
    'transaction_id', v_inviter_tx,
    'invitee_transaction_id', v_invitee_tx
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_public_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_exclusive_promotion_code(
  UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, TEXT, INTEGER, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_issue_invite_milestone_coupons(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_invite_on_signup(UUID, TEXT) TO authenticated, service_role;
