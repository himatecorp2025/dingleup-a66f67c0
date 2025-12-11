-- ============================================
-- CREATOR SYSTEM v2.0 - New Business Model
-- ============================================

-- 1) Update creator_plans: Set all to inactive except 'plus' which becomes 'creator_basic'
UPDATE public.creator_plans SET is_active = false WHERE id != 'plus';

-- Update 'plus' to be the single active plan
UPDATE public.creator_plans 
SET 
  id = 'creator_basic',
  name = 'Creator Basic',
  description = '3 új videó / 24 óra',
  monthly_price_huf = 2990,
  video_limit = 3,
  updated_at = NOW()
WHERE id = 'plus';

-- 2) Create creator_videos table
CREATE TABLE IF NOT EXISTS public.creator_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'facebook')),
  video_url TEXT NOT NULL,
  embed_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  first_activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: same user cannot submit same URL twice
  CONSTRAINT creator_videos_user_url_unique UNIQUE (user_id, video_url)
);

-- 3) Create creator_video_topics junction table
CREATE TABLE IF NOT EXISTS public.creator_video_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_video_id UUID NOT NULL REFERENCES public.creator_videos(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each video-topic combination is unique
  CONSTRAINT creator_video_topics_unique UNIQUE (creator_video_id, topic_id)
);

-- 4) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_videos_user_id ON public.creator_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_videos_status ON public.creator_videos(status);
CREATE INDEX IF NOT EXISTS idx_creator_videos_expires_at ON public.creator_videos(expires_at);
CREATE INDEX IF NOT EXISTS idx_creator_videos_first_activated_at ON public.creator_videos(first_activated_at);
CREATE INDEX IF NOT EXISTS idx_creator_video_topics_video_id ON public.creator_video_topics(creator_video_id);
CREATE INDEX IF NOT EXISTS idx_creator_video_topics_topic_id ON public.creator_video_topics(topic_id);

-- 5) Enable RLS on new tables
ALTER TABLE public.creator_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_video_topics ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies for creator_videos
CREATE POLICY "Users can view their own videos" 
  ON public.creator_videos FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" 
  ON public.creator_videos FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
  ON public.creator_videos FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
  ON public.creator_videos FOR DELETE 
  USING (auth.uid() = user_id);

-- 7) RLS Policies for creator_video_topics
CREATE POLICY "Users can view topics for their videos" 
  ON public.creator_video_topics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_videos 
      WHERE id = creator_video_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add topics to their videos" 
  ON public.creator_video_topics FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_videos 
      WHERE id = creator_video_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove topics from their videos" 
  ON public.creator_video_topics FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_videos 
      WHERE id = creator_video_id AND user_id = auth.uid()
    )
  );

-- 8) Update trigger for creator_videos
CREATE TRIGGER update_creator_videos_updated_at
  BEFORE UPDATE ON public.creator_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Function to check 3/24h activation limit
CREATE OR REPLACE FUNCTION public.check_creator_activation_limit(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.creator_videos
  WHERE user_id = p_user_id
    AND first_activated_at >= NOW() - INTERVAL '24 hours';
  
  RETURN v_count;
END;
$$;

-- 10) Function to activate a new video
CREATE OR REPLACE FUNCTION public.activate_creator_video(p_video_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_limit INTEGER;
  v_video RECORD;
  v_subscription RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Check if video exists and belongs to user
  SELECT * INTO v_video
  FROM public.creator_videos
  WHERE id = p_video_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VIDEO_NOT_FOUND');
  END IF;
  
  -- Check if video is already activated
  IF v_video.first_activated_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACTIVATED');
  END IF;
  
  -- Check subscription status
  SELECT * INTO v_subscription
  FROM public.creator_subscriptions
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_subscription.status NOT IN ('active', 'active_trial', 'cancel_at_period_end') THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_SUBSCRIPTION');
  END IF;
  
  -- Check 3/24h limit
  v_current_limit := check_creator_activation_limit(v_user_id);
  
  IF v_current_limit >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_REACHED', 'current_count', v_current_limit);
  END IF;
  
  -- Activate the video
  UPDATE public.creator_videos
  SET 
    first_activated_at = NOW(),
    expires_at = NOW() + INTERVAL '90 days',
    is_active = true,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_video_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'activated_at', NOW(),
    'expires_at', NOW() + INTERVAL '90 days',
    'remaining_today', 2 - v_current_limit
  );
END;
$$;

-- 11) Function to reactivate an existing video (+90 days)
CREATE OR REPLACE FUNCTION public.reactivate_creator_video(p_video_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_video RECORD;
  v_subscription RECORD;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Check if video exists and belongs to user
  SELECT * INTO v_video
  FROM public.creator_videos
  WHERE id = p_video_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VIDEO_NOT_FOUND');
  END IF;
  
  -- Check subscription status
  SELECT * INTO v_subscription
  FROM public.creator_subscriptions
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_subscription.status NOT IN ('active', 'active_trial', 'cancel_at_period_end') THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_SUBSCRIPTION');
  END IF;
  
  -- Calculate new expiry date
  IF v_video.expires_at IS NOT NULL AND v_video.expires_at > NOW() THEN
    -- Video still active: add 90 days to current expiry
    v_new_expires_at := v_video.expires_at + INTERVAL '90 days';
  ELSE
    -- Video expired: start fresh from now
    v_new_expires_at := NOW() + INTERVAL '90 days';
  END IF;
  
  -- Update the video
  UPDATE public.creator_videos
  SET 
    expires_at = v_new_expires_at,
    is_active = true,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_video_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'new_expires_at', v_new_expires_at
  );
END;
$$;

-- 12) Function to get creator videos with days remaining
CREATE OR REPLACE FUNCTION public.get_creator_videos_with_days(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  platform TEXT,
  video_url TEXT,
  embed_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  first_activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    cv.id,
    cv.user_id,
    cv.platform,
    cv.video_url,
    cv.embed_url,
    cv.thumbnail_url,
    cv.title,
    cv.first_activated_at,
    cv.expires_at,
    cv.is_active,
    cv.status,
    cv.created_at,
    CASE 
      WHEN cv.expires_at IS NULL THEN NULL
      WHEN cv.expires_at <= NOW() THEN 0
      ELSE CEIL(EXTRACT(EPOCH FROM (cv.expires_at - NOW())) / 86400)::INTEGER
    END AS days_remaining
  FROM public.creator_videos cv
  WHERE cv.user_id = v_user_id
  ORDER BY cv.expires_at ASC NULLS LAST;
END;
$$;