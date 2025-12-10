-- Create RPC function for activating creator trial
CREATE OR REPLACE FUNCTION public.activate_creator_trial(p_plan_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status TEXT;
  v_is_creator BOOLEAN;
  v_plan_exists BOOLEAN;
  v_trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  
  -- Check if plan exists and is active
  SELECT EXISTS(
    SELECT 1 FROM creator_plans WHERE id = p_plan_id AND is_active = true
  ) INTO v_plan_exists;
  
  IF NOT v_plan_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PLAN');
  END IF;
  
  -- Get current creator status
  SELECT is_creator, creator_subscription_status 
  INTO v_is_creator, v_current_status
  FROM profiles 
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;
  
  -- Check if user already has active subscription
  IF v_current_status IN ('active_trial', 'active_paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ACTIVE');
  END IF;
  
  -- Calculate trial end date (30 days from now)
  v_trial_end := NOW() + INTERVAL '30 days';
  
  -- Update profile with trial activation
  UPDATE profiles
  SET 
    is_creator = true,
    creator_plan_id = p_plan_id,
    creator_subscription_status = 'active_trial',
    creator_trial_ends_at = v_trial_end,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Return success with updated data
  RETURN jsonb_build_object(
    'success', true,
    'plan_id', p_plan_id,
    'status', 'active_trial',
    'trial_ends_at', v_trial_end
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.activate_creator_trial(TEXT) TO authenticated;