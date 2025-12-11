-- Fix use_life to use SECONDS instead of MINUTES for regeneration calculation
-- The lives_regeneration_rate field stores SECONDS, not minutes

CREATE OR REPLACE FUNCTION public.use_life()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_lives INTEGER;
  v_max_lives INTEGER;
  v_last_regen TIMESTAMPTZ;
  v_regen_rate INTEGER; -- This is in SECONDS
  v_now TIMESTAMPTZ;
  v_seconds_passed NUMERIC;
  v_lives_to_add INTEGER;
  v_updated_lives INTEGER;
  v_idempotency_key TEXT;
  v_active_speed_expires TIMESTAMPTZ;
  v_has_active_speed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  v_idempotency_key := 'game_start:' || v_user_id::text || ':' || extract(epoch from v_now)::text;
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Lock and fetch user profile WITH speed token check
  SELECT 
    COALESCE(lives, 0),
    COALESCE(max_lives, 15),
    COALESCE(last_life_regeneration, v_now),
    COALESCE(lives_regeneration_rate, 60), -- Default 60 SECONDS per life
    active_speed_expires_at
  INTO v_current_lives, v_max_lives, v_last_regen, v_regen_rate, v_active_speed_expires
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;
  
  -- Normalize future timestamps (CRITICAL guard)
  IF v_last_regen > v_now THEN
    v_last_regen := v_now;
    UPDATE public.profiles SET last_life_regeneration = v_now WHERE id = v_user_id;
  END IF;
  
  -- Check if speed boost is active
  v_has_active_speed := (v_active_speed_expires IS NOT NULL AND v_active_speed_expires > v_now);
  
  -- Apply speed boost: 2x faster regeneration (half the time)
  IF v_has_active_speed THEN
    v_regen_rate := v_regen_rate / 2;
  END IF;
  
  -- CRITICAL: Only regenerate if below max_lives, preserve bonus lives above max
  IF v_current_lives < v_max_lives THEN
    -- FIX: Calculate regenerated lives using SECONDS (not minutes)
    -- lives_regeneration_rate is stored in SECONDS
    v_seconds_passed := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_last_regen)));
    v_lives_to_add := FLOOR(v_seconds_passed / v_regen_rate)::INTEGER;
    v_updated_lives := LEAST(v_current_lives + v_lives_to_add, v_max_lives);
  ELSE
    -- Above max_lives (bonus lives) - preserve them, no regeneration
    v_updated_lives := v_current_lives;
  END IF;
  
  -- Check if user has at least 1 life after regeneration
  IF v_updated_lives < 1 THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct 1 life
  UPDATE public.profiles
  SET 
    lives = v_updated_lives - 1,
    last_life_regeneration = v_now
  WHERE id = v_user_id;
  
  -- Log to wallet_ledger with idempotency_key
  INSERT INTO public.wallet_ledger (user_id, delta_coins, delta_lives, source, idempotency_key, metadata)
  VALUES (
    v_user_id,
    0,
    -1,
    'game_start',
    v_idempotency_key,
    jsonb_build_object('timestamp', v_now, 'speed_boost_active', v_has_active_speed)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;