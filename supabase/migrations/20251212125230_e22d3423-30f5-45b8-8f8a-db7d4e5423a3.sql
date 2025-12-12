-- Creator channels table for managing creator's social media channels
CREATE TABLE IF NOT EXISTS public.creator_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'facebook')),
  channel_handle TEXT,
  channel_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(creator_id, platform, channel_handle)
);

-- Ad events table for tracking video ad interactions (anonymized)
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.creator_videos(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'view_start', 'qualified_15s', 'qualified_30s', 'click_out')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  topic_tag TEXT,
  player_segment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin notes for creators
CREATE TABLE IF NOT EXISTS public.creator_admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator audit log for admin actions
CREATE TABLE IF NOT EXISTS public.creator_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add admin_status column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'creator_status') THEN
    ALTER TABLE public.profiles ADD COLUMN creator_status TEXT DEFAULT 'active' CHECK (creator_status IN ('active', 'inactive', 'suspended'));
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.creator_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_channels
CREATE POLICY "Admins can view all creator channels" ON public.creator_channels
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage creator channels" ON public.creator_channels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can view own channels" ON public.creator_channels
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can manage own channels" ON public.creator_channels
  FOR ALL USING (auth.uid() = creator_id);

-- RLS Policies for ad_events (admin only)
CREATE POLICY "Admins can view ad events" ON public.ad_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert ad events" ON public.ad_events
  FOR INSERT WITH CHECK (true);

-- RLS Policies for creator_admin_notes
CREATE POLICY "Admins can manage creator notes" ON public.creator_admin_notes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for creator_audit_log
CREATE POLICY "Admins can view creator audit log" ON public.creator_audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert creator audit log" ON public.creator_audit_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_channels_creator_id ON public.creator_channels(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_channels_platform ON public.creator_channels(platform);
CREATE INDEX IF NOT EXISTS idx_ad_events_video_id ON public.ad_events(video_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_creator_id ON public.ad_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_occurred_at ON public.ad_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_ad_events_event_type ON public.ad_events(event_type);
CREATE INDEX IF NOT EXISTS idx_creator_audit_log_creator_id ON public.creator_audit_log(creator_id);

-- Trigger for updated_at on creator_channels
CREATE OR REPLACE TRIGGER update_creator_channels_updated_at
  BEFORE UPDATE ON public.creator_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();