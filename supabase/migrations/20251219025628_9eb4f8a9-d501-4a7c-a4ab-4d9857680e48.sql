-- FIX: Remove triggers that reference non-existent weekly_rankings table
-- These triggers cause registration to fail with "relation weekly_rankings does not exist"

DROP TRIGGER IF EXISTS trigger_initialize_weekly_rankings ON public.profiles;
DROP TRIGGER IF EXISTS ensure_mixed_ranking_on_user_create ON public.profiles;

-- Also drop the functions if they exist and are not used elsewhere
DROP FUNCTION IF EXISTS public.initialize_weekly_rankings_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_mixed_weekly_ranking() CASCADE;