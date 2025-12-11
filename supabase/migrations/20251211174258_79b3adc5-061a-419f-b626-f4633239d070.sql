-- Add analytics columns to creator_videos table
ALTER TABLE public.creator_videos
ADD COLUMN IF NOT EXISTS total_impressions integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_video_completions integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_relevant_hits integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clickthrough integer NOT NULL DEFAULT 0;

-- Create creator_analytics_daily table for aggregated daily stats
CREATE TABLE IF NOT EXISTS public.creator_analytics_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  video_id uuid REFERENCES public.creator_videos(id) ON DELETE CASCADE,
  date date NOT NULL,
  platform text,
  impressions integer NOT NULL DEFAULT 0,
  video_completions integer NOT NULL DEFAULT 0,
  relevant_hits integer NOT NULL DEFAULT 0,
  clickthroughs integer NOT NULL DEFAULT 0,
  hour_of_day integer, -- 0-23 for heatmap
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT creator_analytics_daily_hour_check CHECK (hour_of_day IS NULL OR (hour_of_day >= 0 AND hour_of_day <= 23))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_videos_creator_id ON public.creator_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_daily_creator_date ON public.creator_analytics_daily(creator_id, date);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_daily_video_id ON public.creator_analytics_daily(video_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_daily_platform ON public.creator_analytics_daily(platform);
CREATE INDEX IF NOT EXISTS idx_creator_video_impressions_video ON public.creator_video_impressions(creator_video_id);

-- Enable RLS on new table
ALTER TABLE public.creator_analytics_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for creator_analytics_daily
CREATE POLICY "Users can view their own analytics"
ON public.creator_analytics_daily
FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Service role can manage analytics"
ON public.creator_analytics_daily
FOR ALL
USING (auth.role() = 'service_role');

-- Function to aggregate impressions into daily analytics
CREATE OR REPLACE FUNCTION public.aggregate_creator_video_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update creator_videos with aggregated stats from impressions
  UPDATE public.creator_videos cv
  SET 
    total_impressions = COALESCE(stats.total_imp, 0),
    total_video_completions = COALESCE(stats.total_comp, 0),
    total_relevant_hits = COALESCE(stats.total_rel, 0)
  FROM (
    SELECT 
      creator_video_id,
      COUNT(*) as total_imp,
      COUNT(*) FILTER (WHERE watched_full_15s = true) as total_comp,
      COUNT(*) FILTER (WHERE is_relevant_viewer = true) as total_rel
    FROM public.creator_video_impressions
    GROUP BY creator_video_id
  ) stats
  WHERE cv.id = stats.creator_video_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.aggregate_creator_video_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_creator_video_stats() TO service_role;