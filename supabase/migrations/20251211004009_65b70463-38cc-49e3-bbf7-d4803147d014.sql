-- Creator video impressions log table
CREATE TABLE IF NOT EXISTS public.creator_video_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_video_id UUID NOT NULL REFERENCES public.creator_videos(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('daily_gift', 'game_end', 'refill')),
  watched_full_15s BOOLEAN NOT NULL DEFAULT false,
  is_relevant_viewer BOOLEAN NOT NULL DEFAULT false,
  sequence_position INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add duration_seconds to creator_videos for video length tracking
ALTER TABLE public.creator_videos 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT NULL;

-- Video ad reward configuration (admin parameterizable)
CREATE TABLE IF NOT EXISTS public.video_ad_rewards (
  id TEXT PRIMARY KEY,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  lives_reward INTEGER NOT NULL DEFAULT 0,
  videos_required INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default reward configurations
INSERT INTO public.video_ad_rewards (id, coins_reward, lives_reward, videos_required) VALUES
  ('refill', 500, 5, 2),
  ('daily_gift_double', 0, 0, 1),
  ('game_end_double', 0, 0, 1)
ON CONFLICT (id) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_video_impressions_video ON public.creator_video_impressions(creator_video_id);
CREATE INDEX IF NOT EXISTS idx_creator_video_impressions_viewer ON public.creator_video_impressions(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_creator_video_impressions_created ON public.creator_video_impressions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_videos_active_expires ON public.creator_videos(is_active, expires_at) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.creator_video_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ad_rewards ENABLE ROW LEVEL SECURITY;

-- Impressions: users can insert their own, admins can read all
CREATE POLICY "Users can insert own impressions" ON public.creator_video_impressions
  FOR INSERT WITH CHECK (viewer_user_id = auth.uid());

CREATE POLICY "Admins can read all impressions" ON public.creator_video_impressions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role full access impressions" ON public.creator_video_impressions
  FOR ALL USING (auth.role() = 'service_role');

-- Video ad rewards: everyone can read, admins can modify
CREATE POLICY "Anyone can read video ad rewards" ON public.video_ad_rewards
  FOR SELECT USING (true);

CREATE POLICY "Admins can modify video ad rewards" ON public.video_ad_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );