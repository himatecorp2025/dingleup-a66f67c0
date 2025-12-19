-- Update claim_daily_gift function to support multipliers based on TOP10 status
-- claimType: 'base' = without ad, 'ad' = with ad
-- Not TOP10: base = 1x, ad = 2x
-- TOP10: base = 3x, ad = 5x

DROP FUNCTION IF EXISTS public.claim_daily_gift();
DROP FUNCTION IF EXISTS public.claim_daily_gift(text);

CREATE OR REPLACE FUNCTION public.claim_daily_gift(p_claim_type text DEFAULT 'base')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_user_timezone text;
  v_country_code text;
  v_current_streak int;
  v_new_streak int;
  v_cycle_position int;
  v_base_reward int;
  v_multiplier int;
  v_final_reward int;
  v_today text;
  v_yesterday text;
  v_last_claimed_date text;
  v_idempotency_key text;
  v_existing_claim record;
  v_yesterday_rank int;
  v_is_top10 boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_LOGGED_IN');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;

  v_user_timezone := COALESCE(v_profile.user_timezone, 'UTC');
  v_country_code := v_profile.country_code;
  v_today := TO_CHAR(NOW() AT TIME ZONE v_user_timezone, 'YYYY-MM-DD');
  v_yesterday := TO_CHAR((NOW() AT TIME ZONE v_user_timezone) - INTERVAL '1 day', 'YYYY-MM-DD');
  
  -- Check if already claimed today
  IF v_profile.daily_gift_last_claimed IS NOT NULL THEN
    v_last_claimed_date := TO_CHAR(v_profile.daily_gift_last_claimed AT TIME ZONE v_user_timezone, 'YYYY-MM-DD');
    IF v_last_claimed_date = v_today THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED_TODAY');
    END IF;
  END IF;

  -- Idempotency check (includes claim_type to allow one base OR one ad claim per day)
  v_idempotency_key := 'daily-gift:' || v_user_id || ':' || v_today || ':' || p_claim_type;
  SELECT * INTO v_existing_claim FROM wallet_ledger WHERE idempotency_key = v_idempotency_key LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED_TODAY');
  END IF;
  
  -- Also check if ANY daily gift claim was made today (prevent base + ad double claim)
  SELECT * INTO v_existing_claim FROM wallet_ledger 
  WHERE idempotency_key LIKE 'daily-gift:' || v_user_id || ':' || v_today || ':%' LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED_TODAY');
  END IF;

  -- Calculate base reward from streak cycle
  v_current_streak := COALESCE(v_profile.daily_gift_streak, 0);
  v_new_streak := v_current_streak + 1;
  v_cycle_position := v_current_streak % 7;
  v_base_reward := CASE v_cycle_position
    WHEN 0 THEN 50 WHEN 1 THEN 75 WHEN 2 THEN 110 WHEN 3 THEN 160
    WHEN 4 THEN 220 WHEN 5 THEN 300 WHEN 6 THEN 500
    ELSE 50
  END;

  -- Check if user was in TOP10 yesterday
  SELECT rank INTO v_yesterday_rank
  FROM daily_rankings
  WHERE user_id = v_user_id AND day_date = v_yesterday::date
  LIMIT 1;
  
  v_is_top10 := v_yesterday_rank IS NOT NULL AND v_yesterday_rank <= 10;

  -- Calculate multiplier based on TOP10 status and claim type
  -- Not TOP10: base = 1x, ad = 2x
  -- TOP10: base = 3x, ad = 5x
  IF v_is_top10 THEN
    v_multiplier := CASE WHEN p_claim_type = 'ad' THEN 5 ELSE 3 END;
  ELSE
    v_multiplier := CASE WHEN p_claim_type = 'ad' THEN 2 ELSE 1 END;
  END IF;

  v_final_reward := v_base_reward * v_multiplier;

  -- Credit coins with full metadata
  INSERT INTO wallet_ledger (user_id, delta_coins, delta_lives, source, idempotency_key, metadata)
  VALUES (v_user_id, v_final_reward, 0, 'daily', v_idempotency_key,
    jsonb_build_object(
      'streak', v_new_streak, 
      'cycle_position', v_cycle_position, 
      'date', v_today, 
      'timezone', v_user_timezone,
      'claim_type', p_claim_type,
      'base_reward', v_base_reward,
      'multiplier', v_multiplier,
      'is_top10', v_is_top10,
      'yesterday_rank', v_yesterday_rank,
      'country_code', v_country_code
    ));

  -- Update profile: both last_claimed AND last_seen
  UPDATE profiles
  SET coins = COALESCE(coins, 0) + v_final_reward,
      daily_gift_streak = v_new_streak,
      daily_gift_last_claimed = NOW(),
      daily_gift_last_seen = v_today::date
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'grantedCoins', v_final_reward,
    'baseReward', v_base_reward,
    'multiplier', v_multiplier,
    'claimType', p_claim_type,
    'isTop10', v_is_top10,
    'yesterdayRank', v_yesterday_rank,
    'walletBalance', COALESCE(v_profile.coins, 0) + v_final_reward, 
    'streak', v_new_streak
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'SERVER_ERROR', 'details', SQLERRM);
END;
$$;