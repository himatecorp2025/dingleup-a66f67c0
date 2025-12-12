-- Add source column to subscribers table to track where subscription came from
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS source text DEFAULT 'landing';

-- Add name column for optional subscriber name
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS name text;

-- Add RLS policy for admins to view all subscribers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Admins can view all subscribers'
  ) THEN
    ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can view all subscribers" ON public.subscribers FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Allow service role to insert subscribers (for edge functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscribers' AND policyname = 'Service role can insert subscribers'
  ) THEN
    CREATE POLICY "Service role can insert subscribers" ON public.subscribers FOR INSERT WITH CHECK (true);
  END IF;
END $$;