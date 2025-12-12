-- ============================================================================
-- SET-BASED DAILY WINNERS PROCESSING RPC
-- ============================================================================
-- Processes all winners for a given date using window functions
-- Adapted to existing constraints

CREATE OR REPLACE FUNCTION public.process_daily_winners_for_date(
  p_target_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_sunday BOOLEAN;
  v_winners_count INTEGER := 0;
  v_snapshot_count INTEGER := 0;
BEGIN
  -- Calculate day of week (1=Monday, 7=Sunday)
  v_day_of_week := EXTRACT(ISODOW FROM p_target_date);
  v_is_sunday := (v_day_of_week = 7);

  -- SET-BASED PROCESSING: ALL COUNTRIES IN SINGLE CTE
  WITH ranked_users AS (
    SELECT
      dr.user_id,
      p.country_code,
      dr.day_date,
      dr.total_correct_answers,
      dr.average_response_time,
      p.user_timezone,
      p.username,
      p.avatar_url,
      RANK() OVER (
        PARTITION BY p.country_code
        ORDER BY dr.total_correct_answers DESC,
                 dr.average_response_time ASC
      ) AS rnk
    FROM daily_rankings dr
    INNER JOIN profiles p ON p.id = dr.user_id
    WHERE dr.day_date = p_target_date
      AND dr.category = 'mixed'
      AND p.country_code IS NOT NULL
  ),
  winners AS (
    SELECT *
    FROM ranked_users
    WHERE (v_is_sunday AND rnk <= 25)
       OR (NOT v_is_sunday AND rnk <= 10)
  ),
  inserted_awards AS (
    INSERT INTO daily_winner_awarded (
      user_id,
      day_date,
      rank,
      gold_awarded,
      lives_awarded,
      status,
      is_sunday_jackpot,
      country_code,
      user_timezone,
      username,
      avatar_url,
      total_correct_answers,
      reward_payload,
      awarded_at
    )
    SELECT
      w.user_id,
      w.day_date,
      w.rnk,
      dpt.gold,
      dpt.lives,
      'pending',
      v_is_sunday,
      w.country_code,
      w.user_timezone,
      w.username,
      w.avatar_url,
      w.total_correct_answers,
      jsonb_build_object(
        'rank', w.rnk,
        'gold', dpt.gold,
        'lives', dpt.lives,
        'country_code', w.country_code,
        'timezone', w.user_timezone,
        'day_type', CASE WHEN v_is_sunday THEN 'sunday_jackpot' ELSE 'normal' END
      ),
      NOW()
    FROM winners w
    INNER JOIN daily_prize_table dpt
      ON dpt.rank = w.rnk
     AND dpt.day_of_week = v_day_of_week
    ON CONFLICT (user_id, day_date) DO NOTHING
    RETURNING *
  ),
  inserted_snapshots AS (
    INSERT INTO daily_leaderboard_snapshot (
      user_id,
      username,
      avatar_url,
      country_code,
      rank,
      total_correct_answers,
      snapshot_date,
      created_at
    )
    SELECT
      w.user_id,
      w.username,
      w.avatar_url,
      w.country_code,
      w.rnk,
      w.total_correct_answers,
      w.day_date,
      NOW()
    FROM winners w
    ON CONFLICT (snapshot_date, user_id, country_code) DO NOTHING
    RETURNING *
  )
  SELECT
    (SELECT COUNT(*) FROM inserted_awards),
    (SELECT COUNT(*) FROM inserted_snapshots)
  INTO v_winners_count, v_snapshot_count;

  RETURN jsonb_build_object(
    'success', true,
    'target_date', p_target_date,
    'day_of_week', v_day_of_week,
    'is_sunday', v_is_sunday,
    'top_limit', CASE WHEN v_is_sunday THEN 25 ELSE 10 END,
    'winners_inserted', v_winners_count,
    'snapshots_inserted', v_snapshot_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[process_daily_winners_for_date] Processing failed for %: % (SQLSTATE: %)', 
      p_target_date, SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'target_date', p_target_date
    );
END;
$$;

COMMENT ON FUNCTION public.process_daily_winners_for_date IS 
'Set-based daily winners processing using window functions.
Processes all countries in single operation with idempotent inserts.';

GRANT EXECUTE ON FUNCTION public.process_daily_winners_for_date TO service_role;
GRANT EXECUTE ON FUNCTION public.process_daily_winners_for_date TO authenticated;