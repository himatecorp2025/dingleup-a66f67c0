-- ============================================================================
-- CLAIM DAILY WINNER REWARD RPC
-- Atomic transaction for claiming pending daily rank rewards
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_daily_winner_reward(
  p_user_id UUID,
  p_day_date DATE,
  p_country_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward RECORD;
  v_gold INTEGER;
  v_lives INTEGER;
  v_rank INTEGER;
  v_idempotency_key TEXT;
BEGIN
  -- Set lock timeout for high-load scenarios
  SET LOCAL lock_timeout = '5s';
  
  -- Find and lock the pending reward
  SELECT * INTO v_reward
  FROM daily_winner_awarded
  WHERE user_id = p_user_id
    AND day_date = p_day_date
    AND status = 'pending'
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    -- Check if already claimed (idempotency)
    SELECT * INTO v_reward
    FROM daily_winner_awarded
    WHERE user_id = p_user_id
      AND day_date = p_day_date
      AND status = 'claimed';
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'gold', v_reward.gold_awarded,
        'lives', v_reward.lives_awarded,
        'rank', v_reward.rank
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NO_PENDING_REWARD',
      'message', 'No pending reward found'
    );
  END IF;
  
  v_gold := v_reward.gold_awarded;
  v_lives := v_reward.lives_awarded;
  v_rank := v_reward.rank;
  v_idempotency_key := 'daily_rank_reward:' || p_user_id || ':' || p_day_date;
  
  -- Credit gold via wallet_ledger (idempotent)
  INSERT INTO wallet_ledger (user_id, delta_coins, delta_lives, source, idempotency_key, metadata)
  VALUES (
    p_user_id,
    v_gold,
    v_lives,
    'daily_rank_reward',
    v_idempotency_key,
    jsonb_build_object('rank', v_rank, 'day_date', p_day_date, 'is_sunday_jackpot', v_reward.is_sunday_jackpot)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  -- Update profiles balance
  UPDATE profiles
  SET 
    coins = COALESCE(coins, 0) + v_gold,
    lives = COALESCE(lives, 0) + v_lives,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Mark reward as claimed
  UPDATE daily_winner_awarded
  SET 
    status = 'claimed',
    claimed_at = NOW()
  WHERE id = v_reward.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'gold', v_gold,
    'lives', v_lives,
    'rank', v_rank
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'LOCK_TIMEOUT',
      'message', 'Concurrent claim attempt'
    );
  WHEN OTHERS THEN
    RAISE WARNING '[claim_daily_winner_reward] Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SERVER_ERROR',
      'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.claim_daily_winner_reward IS 
'Atomic daily rank reward claiming with idempotency and row locking.';

GRANT EXECUTE ON FUNCTION public.claim_daily_winner_reward TO service_role;