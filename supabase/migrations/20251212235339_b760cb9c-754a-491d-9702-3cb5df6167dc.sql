-- Timezone-aware leaderboard cache refresh function
-- This computes rankings based on each user's local timezone day

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_cache_timezone_aware()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear old cache
  TRUNCATE TABLE public.leaderboard_cache;
  
  -- Insert fresh TOP 100 per country
  -- Each user's rankings are based on their local timezone day
  INSERT INTO public.leaderboard_cache (
    country_code,
    rank,
    user_id,
    username,
    total_correct_answers,
    avatar_url,
    cached_at
  )
  WITH user_local_dates AS (
    -- Calculate each user's current local date based on their timezone
    SELECT 
      p.id as user_id,
      p.username,
      p.avatar_url,
      p.country_code,
      p.user_timezone,
      TO_CHAR(
        NOW() AT TIME ZONE COALESCE(p.user_timezone, 'UTC'),
        'YYYY-MM-DD'
      ) as local_date
    FROM public.profiles p
    WHERE p.country_code IS NOT NULL
  ),
  user_rankings AS (
    -- Get each user's correct answers for their local day
    SELECT 
      uld.user_id,
      uld.username,
      uld.avatar_url,
      uld.country_code,
      COALESCE(dr.total_correct_answers, 0) AS total_correct_answers
    FROM user_local_dates uld
    LEFT JOIN public.daily_rankings dr ON (
      dr.user_id = uld.user_id 
      AND dr.day_date = uld.local_date 
      AND dr.category = 'mixed'
    )
  ),
  ranked_users AS (
    -- Calculate ranks per country
    SELECT 
      country_code,
      user_id,
      username,
      avatar_url,
      total_correct_answers,
      ROW_NUMBER() OVER (
        PARTITION BY country_code 
        ORDER BY total_correct_answers DESC, username ASC
      ) AS rank
    FROM user_rankings
  )
  SELECT 
    country_code,
    rank::INTEGER,
    user_id,
    username,
    total_correct_answers::INTEGER,
    avatar_url,
    NOW() AS cached_at
  FROM ranked_users
  WHERE rank <= 100
  ORDER BY country_code, rank;
  
  -- Log completion
  RAISE NOTICE 'Leaderboard cache refreshed (timezone-aware): % entries', 
    (SELECT COUNT(*) FROM public.leaderboard_cache);
END;
$$;