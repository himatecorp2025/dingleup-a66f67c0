-- Create reward_sessions table for pending game-end rewards
CREATE TABLE IF NOT EXISTS public.reward_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('daily_gift', 'end_game', 'refill')),
  original_reward INTEGER NOT NULL DEFAULT 0,
  multiplier INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  game_result_id UUID REFERENCES public.game_results(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  watched_video_ids TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_reward_sessions_user_status ON public.reward_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reward_sessions_created ON public.reward_sessions(created_at);

-- Enable RLS
ALTER TABLE public.reward_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reward sessions"
  ON public.reward_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reward sessions"
  ON public.reward_sessions FOR ALL
  USING (true)
  WITH CHECK (true);