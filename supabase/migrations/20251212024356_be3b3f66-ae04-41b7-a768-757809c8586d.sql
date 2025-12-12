-- Enable RLS on archive tables (backend-only access via service_role)
ALTER TABLE public.app_session_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_question_analytics_archive ENABLE ROW LEVEL SECURITY;

-- Create policies for service_role only (no public access to archives)
CREATE POLICY "Service role can manage app_session_events_archive"
ON public.app_session_events_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage feature_usage_events_archive"
ON public.feature_usage_events_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage game_question_analytics_archive"
ON public.game_question_analytics_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);