-- Create creator_subscriptions table for tracking creator packages
CREATE TABLE public.creator_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL CHECK (package_type IN ('starter', 'creator_plus', 'creator_pro', 'creator_max')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active_trial', 'active', 'cancelled', 'expired')),
  max_videos INTEGER NOT NULL DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.creator_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
  ON public.creator_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
  ON public.creator_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins full access to creator_subscriptions"
  ON public.creator_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create index for faster lookups
CREATE INDEX idx_creator_subscriptions_user_id ON public.creator_subscriptions(user_id);
CREATE INDEX idx_creator_subscriptions_status ON public.creator_subscriptions(status);

-- Update trigger
CREATE TRIGGER update_creator_subscriptions_updated_at
  BEFORE UPDATE ON public.creator_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();