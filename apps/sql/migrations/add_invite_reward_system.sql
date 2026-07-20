-- 친구 초대: 가입 시 초대자 적립 + 관리자 적립금액 설정
-- 기본 적립: 1,000P (가입 완료 시 1회)

-- 1) 관리자 설정 (싱글톤)
CREATE TABLE IF NOT EXISTS public.invite_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  invite_reward_amount INTEGER NOT NULL DEFAULT 1000
    CHECK (invite_reward_amount >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.invite_settings (id, invite_reward_amount, is_active)
VALUES (1, 1000, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.invite_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read invite_settings" ON public.invite_settings;
CREATE POLICY "Anyone can read invite_settings"
  ON public.invite_settings FOR SELECT
  USING (true);

-- 2) users 초대 컬럼
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_rewarded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code_unique
  ON public.users (invite_code)
  WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_invited_by
  ON public.users (invited_by)
  WHERE invited_by IS NOT NULL;

-- 3) 초대 코드 발급 (없으면 생성)
CREATE OR REPLACE FUNCTION public.ensure_user_invite_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_try INT := 0;
BEGIN
  SELECT invite_code INTO v_code
  FROM public.users
  WHERE id = p_user_id;

  IF v_code IS NOT NULL AND btrim(v_code) <> '' THEN
    RETURN upper(v_code);
  END IF;

  LOOP
    v_try := v_try + 1;
    v_code := 'MODO' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    BEGIN
      UPDATE public.users
      SET invite_code = v_code, updated_at = NOW()
      WHERE id = p_user_id
        AND (invite_code IS NULL OR btrim(invite_code) = '');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 8 THEN
        RAISE EXCEPTION 'Failed to allocate invite_code';
      END IF;
    END;
  END LOOP;

  SELECT invite_code INTO v_code FROM public.users WHERE id = p_user_id;
  RETURN upper(v_code);
END;
$$;

-- 4) 가입 시 초대코드 적용 → 초대자 적립 (1회)
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
  v_amount INTEGER;
  v_active BOOLEAN;
  v_tx UUID;
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

  SELECT invite_reward_amount, is_active
    INTO v_amount, v_active
  FROM public.invite_settings
  WHERE id = 1;

  v_amount := COALESCE(v_amount, 1000);
  v_active := COALESCE(v_active, TRUE);

  -- 연결은 항상 기록
  UPDATE public.users
  SET invited_by = v_inviter.id,
      invite_rewarded_at = CASE WHEN v_active AND v_amount > 0 THEN NOW() ELSE invite_rewarded_at END,
      updated_at = NOW()
  WHERE id = v_invitee.id;

  UPDATE public.users
  SET invite_count = COALESCE(invite_count, 0) + 1,
      updated_at = NOW()
  WHERE id = v_inviter.id;

  IF v_active AND v_amount > 0 THEN
    v_tx := manage_user_points(
      v_inviter.id,
      v_amount,
      'EARNED'::point_transaction_type,
      '친구초대 보상 (가입)',
      NULL,
      NULL,
      NOW() + INTERVAL '30 days'
    );

    UPDATE public.users
    SET invite_points_earned = COALESCE(invite_points_earned, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_inviter.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'inviter_id', v_inviter.id,
    'amount', CASE WHEN v_active THEN v_amount ELSE 0 END,
    'transaction_id', v_tx
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_invite_code(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_invite_on_signup(UUID, TEXT) TO authenticated, service_role;

COMMENT ON TABLE public.invite_settings IS '친구 초대 적립 설정 (관리자). 기본 1000P, 가입 시 초대자에게 지급';
COMMENT ON FUNCTION public.apply_invite_on_signup IS '피초대자 가입 시 초대코드 적용 및 초대자 포인트 적립 (1회)';
