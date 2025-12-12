-- Create archive tables for analytics data (90-day retention)
CREATE TABLE IF NOT EXISTS public.app_session_events_archive (
  LIKE public.app_session_events INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_usage_events_archive (
  LIKE public.feature_usage_events INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.game_question_analytics_archive (
  LIKE public.game_question_analytics INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT now()
);

-- Create function to archive old analytics data (90 days)
CREATE OR REPLACE FUNCTION public.archive_old_analytics_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ := now() - INTERVAL '90 days';
  session_count INTEGER := 0;
  feature_count INTEGER := 0;
  question_count INTEGER := 0;
BEGIN
  -- Archive app_session_events
  WITH moved AS (
    DELETE FROM public.app_session_events
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.app_session_events_archive 
  SELECT *, now() FROM moved;
  GET DIAGNOSTICS session_count = ROW_COUNT;

  -- Archive feature_usage_events
  WITH moved AS (
    DELETE FROM public.feature_usage_events
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.feature_usage_events_archive 
  SELECT *, now() FROM moved;
  GET DIAGNOSTICS feature_count = ROW_COUNT;

  -- Archive game_question_analytics
  WITH moved AS (
    DELETE FROM public.game_question_analytics
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.game_question_analytics_archive 
  SELECT *, now() FROM moved;
  GET DIAGNOSTICS question_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'archived_session_events', session_count,
    'archived_feature_events', feature_count,
    'archived_question_analytics', question_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.archive_old_analytics_data() TO service_role;