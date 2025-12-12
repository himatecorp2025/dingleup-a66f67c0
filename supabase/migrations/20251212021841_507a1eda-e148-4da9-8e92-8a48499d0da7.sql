-- Fix performance_metrics RLS policy - allow users to insert their own metrics
DROP POLICY IF EXISTS "Users can insert own performance metrics" ON public.performance_metrics;

CREATE POLICY "Users can insert own performance metrics"
ON public.performance_metrics
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- Also allow anonymous inserts for non-logged-in users tracking
DROP POLICY IF EXISTS "Allow anonymous performance metrics insert" ON public.performance_metrics;

CREATE POLICY "Allow anonymous performance metrics insert"
ON public.performance_metrics
FOR INSERT
WITH CHECK (user_id IS NULL);