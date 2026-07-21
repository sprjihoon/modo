-- 회원가입 축하 포인트 (기본 1000P, 관리자 설정)
-- public.users INSERT 시 1회 자동 지급 (웹/앱/OAuth 공통)

-- 1) 설정 컬럼 (invite_settings 싱글톤 확장)
ALTER TABLE public.invite_settings
  ADD COLUMN IF NOT EXISTS signup_reward_amount INTEGER NOT NULL DEFAULT 1000
    CHECK (signup_reward_amount >= 0),
  ADD COLUMN IF NOT EXISTS signup_reward_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.invite_settings
SET signup_reward_amount = COALESCE(signup_reward_amount, 1000),
    signup_reward_active = COALESCE(signup_reward_active, TRUE)
WHERE id = 1;

-- 2) 지급 이력 (멱등)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_rewarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invite_settings.signup_reward_amount IS '회원가입 시 신규 고객에게 지급하는 포인트 (기본 1000)';
COMMENT ON COLUMN public.invite_settings.signup_reward_active IS '회원가입 적립 활성 여부';
COMMENT ON COLUMN public.users.signup_rewarded_at IS '회원가입 축하 포인트 지급 시각 (1회)';

-- 기존 회원은 소급 지급하지 않음 (마킹만)
UPDATE public.users
SET signup_rewarded_at = COALESCE(created_at, NOW())
WHERE signup_rewarded_at IS NULL;

-- 3) 지급 RPC
CREATE OR REPLACE FUNCTION public.grant_signup_reward(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_amount INTEGER;
  v_active BOOLEAN;
  v_tx UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_user');
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'user_not_found');
  END IF;

  -- 고객만 대상
  IF COALESCE(v_user.role::text, 'CUSTOMER') <> 'CUSTOMER' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_customer');
  END IF;

  IF v_user.signup_rewarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_rewarded');
  END IF;

  SELECT signup_reward_amount, signup_reward_active
    INTO v_amount, v_active
  FROM public.invite_settings
  WHERE id = 1;

  v_amount := COALESCE(v_amount, 1000);
  v_active := COALESCE(v_active, TRUE);

  IF NOT v_active OR v_amount <= 0 THEN
    -- 비활성/0원이어도 재시도 방지 마킹
    UPDATE public.users
    SET signup_rewarded_at = NOW(), updated_at = NOW()
    WHERE id = p_user_id AND signup_rewarded_at IS NULL;
    RETURN jsonb_build_object('ok', true, 'amount', 0, 'skipped', true);
  END IF;

  v_tx := manage_user_points(
    p_user_id,
    v_amount,
    'EARNED'::point_transaction_type,
    '회원가입 축하',
    NULL,
    NULL,
    NOW() + INTERVAL '30 days'
  );

  UPDATE public.users
  SET signup_rewarded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'amount', v_amount,
    'transaction_id', v_tx
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_signup_reward(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.grant_signup_reward IS '신규 고객 회원가입 축하 포인트 1회 지급 (관리자 설정 금액)';

-- 4) users INSERT 후 자동 지급
CREATE OR REPLACE FUNCTION public.trg_grant_signup_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.grant_signup_reward(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 가입 자체는 실패시키지 않음
  RAISE WARNING 'grant_signup_reward failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_after_insert_signup_reward ON public.users;
CREATE TRIGGER users_after_insert_signup_reward
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_grant_signup_reward();
