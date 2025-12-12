-- Fix the regenerate_lives_background function with explicit type casting
-- This ensures no type mismatches between TIMESTAMP WITH TIME ZONE and TIME types

CREATE OR REPLACE FUNCTION public.regenerate_lives_background()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_rec RECORD;
  minutes_passed NUMERIC;
  lives_to_add INTEGER;
  regen_rate_minutes NUMERIC;
  effective_max_lives INTEGER;
  v_current_time TIMESTAMP WITH TIME ZONE := NOW();
  last_regen_ts TIMESTAMP WITH TIME ZONE;
  has_active_speed BOOLEAN;
BEGIN
  -- HIGH-LOAD OPTIMIZATION: Only process users who need regeneration
  FOR profile_rec IN 
    SELECT id, lives, max_lives, lives_regeneration_rate, last_life_regeneration, active_speed_expires_at
    FROM public.profiles 
    WHERE lives < COALESCE(max_lives, 15)
    AND last_life_regeneration IS NOT NULL
    AND (last_life_regeneration::TIMESTAMP WITH TIME ZONE) < (v_current_time - INTERVAL '6 minutes')
    ORDER BY last_life_regeneration ASC
    LIMIT 5000
  LOOP
    effective_max_lives := COALESCE(profile_rec.max_lives, 15);
    regen_rate_minutes := COALESCE(profile_rec.lives_regeneration_rate, 12)::NUMERIC;
    
    -- Check active speed from denormalized column
    has_active_speed := (profile_rec.active_speed_expires_at IS NOT NULL 
                         AND (profile_rec.active_speed_expires_at::TIMESTAMP WITH TIME ZONE) > v_current_time);
    
    -- Apply speed boost: 2x faster (half the time)
    IF has_active_speed THEN
      regen_rate_minutes := regen_rate_minutes / 2;
    END IF;
    
    -- Explicit cast to ensure type consistency
    last_regen_ts := (profile_rec.last_life_regeneration)::TIMESTAMP WITH TIME ZONE;
    
    -- Guard: if last_life_regeneration is in the future, normalize it to now
    IF last_regen_ts > v_current_time THEN
      last_regen_ts := v_current_time;
    END IF;
    
    -- Calculate lives to add (ensure non-negative)
    minutes_passed := GREATEST(0, EXTRACT(EPOCH FROM (v_current_time - last_regen_ts)) / 60);
    lives_to_add := FLOOR(minutes_passed / regen_rate_minutes)::INTEGER;
    
    -- Only UPDATE if there are lives to add
    IF lives_to_add > 0 THEN
      UPDATE public.profiles
      SET 
        lives = LEAST(lives + lives_to_add, effective_max_lives),
        last_life_regeneration = last_regen_ts + (lives_to_add * regen_rate_minutes * INTERVAL '1 minute')
      WHERE id = profile_rec.id;
    END IF;
  END LOOP;
END;
$function$;