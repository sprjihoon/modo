-- 초대 코드 적용 시 피초대자(코드 입력한 사람)에게도 포인트 지급
-- 기본 1,000P, 어드민에서 초대자/피초대자 금액 각각 설정

ALTER TABLE public.invite_settings
  ADD COLUMN IF NOT EXISTS invitee_reward_amount INTEGER NOT NULL DEFAULT 1000
    CHECK (invitee_reward_amount >= 0);

UPDATE public.invite_settings
SET invitee_reward_amount = COALESCE(invitee_reward_amount, invite_reward_amount, 1000)
WHERE id = 1;

COMMENT ON COLUMN public.invite_settings.invite_reward_amount IS '초대자(코드 공유) 적립 포인트';
COMMENT ON COLUMN public.invite_settings.invitee_reward_amount IS '피초대자(코드 입력) 적립 포인트';

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

  -- 연결은 항상 기록
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

  RETURN jsonb_build_object(
    'ok', true,
    'inviter_id', v_inviter.id,
    'inviter_amount', CASE WHEN v_active THEN v_inviter_amount ELSE 0 END,
    'invitee_amount', CASE WHEN v_active THEN v_invitee_amount ELSE 0 END,
    -- 하위 호환
    'amount', CASE WHEN v_active THEN v_inviter_amount ELSE 0 END,
    'transaction_id', v_inviter_tx,
    'invitee_transaction_id', v_invitee_tx
  );
END;
$$;

COMMENT ON FUNCTION public.apply_invite_on_signup IS
  '초대코드 적용: 초대자·피초대자 모두 포인트 적립 (1회, 어드민 설정 금액)';
COMMENT ON TABLE public.invite_settings IS
  '친구 초대 적립 설정. 초대자/피초대자 금액 + 회원가입 적립';
