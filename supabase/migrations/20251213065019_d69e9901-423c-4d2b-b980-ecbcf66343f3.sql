-- Update activate_creator_video function: change 90 days to 30 days
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
  
  -- Activate the video for 30 days (changed from 90)
  UPDATE public.creator_videos
  SET 
    first_activated_at = NOW(),
    expires_at = NOW() + INTERVAL '30 days',
    is_active = true,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_video_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'activated_at', NOW(),
    'expires_at', NOW() + INTERVAL '30 days',
    'remaining_today', 2 - v_current_limit
  );
END;
$$;

-- Update reactivate_creator_video function: change 90 days to 30 days
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
  
  -- Calculate new expiry date (30 days, changed from 90)
  IF v_video.expires_at IS NOT NULL AND v_video.expires_at > NOW() THEN
    -- Video still active: add 30 days to current expiry
    v_new_expires_at := v_video.expires_at + INTERVAL '30 days';
  ELSE
    -- Video expired: start fresh from now
    v_new_expires_at := NOW() + INTERVAL '30 days';
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