
-- 1. RLS policies for archive tables (service role only access)
CREATE POLICY "Service role full access to lives_ledger_archive"
ON public.lives_ledger_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to wallet_ledger_archive"
ON public.wallet_ledger_archive
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Fix search_path for get_current_day_date function
CREATE OR REPLACE FUNCTION public.get_current_day_date()
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CURRENT_DATE;
$$;
